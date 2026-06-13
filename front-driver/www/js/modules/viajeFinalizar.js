import {
    viajesActivos,
    getViajeEnCursoId,
    setViajeEnCurso
} from "./viajeControl/viajeEstado.js";

import { limpiarViajeMain } from "./viajeControl/viajeUI.js?v=20260610-route-consume";
import { borrarRuta } from "./map.js?v=20260613-trip-guards";
import {
    FINISH_MAX_DISTANCE_METERS,
    validarCercaniaViaje
} from "./tripGuards.js?v=20260613-trip-guards";

const viajesFinalizadosProcesados = new Set();
const finalizacionesPendientes = new Map();
let socketActual = null;
let clickFinalizarInicializado = false;

function normalizarId(id) {
  return id ? String(id) : null;
}

function labelFinalizar(esEnvio) {
  return esEnvio ? "Confirmer livraison" : "Finaliser la course";
}

function limpiarTimerFinalizacion(viajeId) {
  const id = normalizarId(viajeId);
  if (!id) return null;

  const pendiente = finalizacionesPendientes.get(id);
  if (!pendiente) return null;

  clearTimeout(pendiente.timerGuard);
  finalizacionesPendientes.delete(id);

  const btn = document.getElementById("btnFinalizar");
  if (btn) {
    delete btn.dataset.timerId;
    btn.disabled = false;
    btn.textContent = labelFinalizar(pendiente.esEnvio);
  }

  return pendiente;
}

function obtenerViajeActual(viajeId) {
  return viajesActivos.get(viajeId) || viajesActivos.get(String(viajeId)) || {};
}

export function initViajeFinalizar(socket) {
  socketActual = socket;

  if (!clickFinalizarInicializado) {
    document.addEventListener("click", onClickFinalizar);
    clickFinalizarInicializado = true;
  }

  socket.off("viaje-finalizado", onViajeFinalizado);
  socket.on("viaje-finalizado", onViajeFinalizado);

  socket.off("error-finalizar", onErrorFinalizar);
  socket.on("error-finalizar", onErrorFinalizar);
}

function onClickFinalizar(e) {
    procesarClickFinalizar(e).catch((err) => {
        console.error("Error preparando finalizacion:", err);
        const btn = document.getElementById("btnFinalizar");
        if (btn) btn.disabled = false;
    });
}

async function procesarClickFinalizar(e) {
    const target = e.target.closest("#btnFinalizar");
    if (!target || target.disabled) return;

    const socket = socketActual;
    if (!socket) {
        console.warn("Socket no disponible para finalizar viaje");
        return;
    }

    const viajeId = normalizarId(getViajeEnCursoId());
    if (!viajeId) {
        console.warn("No hay un ID de viaje activo para finalizar");
        return;
    }

    if (finalizacionesPendientes.has(viajeId)) return;

    const viajeActual = obtenerViajeActual(viajeId);
    const esEnvio = viajeActual.tipo === "envio";
    let codigoEntrega = null;

    const guard = await validarCercaniaViaje({
        viaje: viajeActual,
        targetKey: "destino",
        maxDistanceMeters: FINISH_MAX_DISTANCE_METERS,
        missingTargetMessage: "Impossible de verifier la destination de cette course.",
        farMessage: (distancia, limite) =>
            `Tu es encore a ${distancia} de la destination. Rapproche-toi a ${limite} pour finaliser.`
    });

    if (!guard.ok) return;

    if (esEnvio) {
        codigoEntrega = window.prompt("Code de livraison a 4 chiffres");
        codigoEntrega = String(codigoEntrega || "").replace(/\D/g, "").slice(0, 4);
        if (!/^\d{4}$/.test(codigoEntrega)) {
            alert("Entrez le code de livraison a 4 chiffres.");
            return;
        }
    } else if (!confirm("Voulez-vous finaliser la course et encaisser?")) {
        return;
    }

    target.disabled = true;
    target.textContent = "Traitement...";

    const timerGuard = setTimeout(() => {
        const pendiente = finalizacionesPendientes.get(viajeId);
        if (!pendiente || pendiente.timerGuard !== timerGuard) return;

        finalizacionesPendientes.delete(viajeId);
        target.disabled = false;
        target.textContent = labelFinalizar(esEnvio);
        delete target.dataset.timerId;

        console.warn("No se recibio confirmacion al finalizar viaje. Reintento disponible.");
    }, 12000);

    finalizacionesPendientes.set(viajeId, {
        timerGuard,
        esEnvio
    });

    console.log("Enviando finalizar-viaje para:", viajeId);
    socket.emit("finalizar-viaje", {
        viajeId,
        codigoEntrega,
        lat: guard.posicion.lat,
        lng: guard.posicion.lng,
        distanciaMetros: Math.round(guard.distanciaMetros),
        motoristaId: socket.user?._id || socket.user?.id
    });

    target.dataset.timerId = String(timerGuard);
}

function onViajeFinalizado(data = {}) {
    const idFinalizado = normalizarId(data.viajeId || data.id);
    if (!idFinalizado) return;

    const teniaFinalizacionPendiente = !!limpiarTimerFinalizacion(idFinalizado);

    if (viajesFinalizadosProcesados.has(idFinalizado)) return;

    const viajeActivo = normalizarId(getViajeEnCursoId());
    const esViajeActual = viajeActivo && idFinalizado === viajeActivo;
    const existeLocal = viajesActivos.has(idFinalizado);

    if (!teniaFinalizacionPendiente && !esViajeActual && !existeLocal) {
        return;
    }

    viajesFinalizadosProcesados.add(idFinalizado);
    console.log("Confirmacion de fin de viaje recibida:", idFinalizado);

    if (typeof Toastify !== "undefined") {
        const esEnvio = data?.viaje?.tipo === "envio";
        Toastify({
            text: `${esEnvio ? "Livraison finalisee" : "Course finalisee"}\nA encaisser: ${data.total || 0} G`,
            duration: 5000,
            gravity: "top",
            position: "center",
            style: { background: "linear-gradient(to right, #00b09b, #96c93d)", fontWeight: "bold" }
        }).showToast();
    }

    viajesActivos.delete(idFinalizado);

    if (getViajeEnCursoId() === idFinalizado) {
        setViajeEnCurso(null);
    }

    limpiarViajeMain({
        btnIniciar: document.getElementById("btnIniciarViaje"),
        btnFinalizar: document.getElementById("btnFinalizar"),
        estadoBox: document.getElementById("estadoViaje"),
        panelControl: document.getElementById("panelViajeControl")
    });

    if (typeof borrarRuta === "function") borrarRuta();

    window.dispatchEvent(new CustomEvent("driver:trip-finalized", { detail: data }));
}

function onErrorFinalizar(err = {}) {
    alert("Erreur: " + (err.msg || "Impossible de finaliser la course"));

    const id = normalizarId(err.viajeId || getViajeEnCursoId());
    if (id) {
        limpiarTimerFinalizacion(id);
    } else {
        for (const viajeId of finalizacionesPendientes.keys()) {
            limpiarTimerFinalizacion(viajeId);
        }
    }

    const btn = document.getElementById("btnFinalizar");
    if (btn) {
        const viajeId = normalizarId(getViajeEnCursoId());
        const esEnvio = viajeId && obtenerViajeActual(viajeId)?.tipo === "envio";
        btn.disabled = false;
        btn.textContent = labelFinalizar(esEnvio);
        delete btn.dataset.timerId;
    }
}
