import {
    viajesActivos,
    getViajeEnCursoId,
    setViajeEnCurso
} from "./viajeControl/viajeEstado.js";

import { limpiarViajeMain } from "./viajeControl/viajeUI.js?v=20260710-photo-fix";
import { borrarRuta } from "./map.js?v=20260710-route-icons";
import { formatGourdes, getPaymentLabel, isCashMethod } from "./oferta/oferta.money.js?v=20260608-offer-net-cash";
import {
    FINISH_MAX_DISTANCE_METERS,
    validarCercaniaViaje
} from "./tripGuards.js?v=20260627-map-fluid-arrival";

const viajesFinalizadosProcesados = new Set();
const finalizacionesPendientes = new Map();
const MODAL_COBRO_RETORNO_ID = "modalCobroRetornoAnulado";
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

function esRetornoCancelado(data = {}) {
    const idaVuelta = data?.viaje?.idaVuelta || data?.idaVuelta || {};
    return idaVuelta?.estado === "retorno_cancelado";
}

function obtenerTotalFinal(data = {}) {
    const viaje = data.viaje || {};
    const idaVuelta = viaje.idaVuelta || data.idaVuelta || {};
    return data.total ?? viaje.precio ?? idaVuelta.precioIda ?? idaVuelta.precioTotal ?? 0;
}

function mostrarModalCobroRetornoCancelado(data = {}) {
    if (!esRetornoCancelado(data) || !document.body) return;

    document.getElementById(MODAL_COBRO_RETORNO_ID)?.remove();

    const viaje = data.viaje || {};
    const metodoPago = viaje.metodoPago || data.metodoPago || "efectivo";
    const total = obtenerTotalFinal(data);
    const pagoEnEfectivo = isCashMethod(metodoPago);
    const modal = document.createElement("div");

    modal.id = MODAL_COBRO_RETORNO_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
        <div style="
            position:fixed;
            inset:0;
            z-index:99999;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:18px;
            background:rgba(15,23,42,.68);
            backdrop-filter:blur(10px);
        ">
            <div style="
                width:min(92vw,390px);
                border-radius:22px;
                background:#ffffff;
                color:#0f172a;
                box-shadow:0 24px 70px rgba(2,6,23,.38);
                padding:24px;
                font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                text-align:center;
            ">
                <div style="font-size:13px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">
                    Vuelta anulada
                </div>
                <div style="margin-top:10px;font-size:21px;font-weight:950;line-height:1.18;">
                    ${pagoEnEfectivo ? "Cobrar solo la ida" : "Precio final de la ida"}
                </div>
                <div style="margin-top:18px;font-size:42px;font-weight:1000;line-height:1;color:#0f766e;">
                    ${formatGourdes(total)}
                </div>
                <div style="margin-top:14px;font-size:14px;font-weight:800;color:#475569;">
                    ${pagoEnEfectivo ? "Pago en efectivo" : getPaymentLabel(metodoPago)}
                </div>
                <button id="btnCerrarCobroRetornoAnulado" type="button" style="
                    width:100%;
                    margin-top:22px;
                    border:0;
                    border-radius:16px;
                    background:#0f172a;
                    color:white;
                    font-weight:950;
                    font-size:16px;
                    padding:15px 18px;
                    cursor:pointer;
                ">
                    Entendido
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("btnCerrarCobroRetornoAnulado")?.addEventListener("click", () => {
        modal.remove();
    });
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

  socket.off("ida-vuelta:pendiente", onRetornoPendiente);
  socket.on("ida-vuelta:pendiente", onRetornoPendiente);

  socket.off("ida-vuelta:retorno-iniciado", onRetornoIniciado);
  socket.on("ida-vuelta:retorno-iniciado", onRetornoIniciado);
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
    const vaDeVuelta = viajeActual.idaVuelta?.estado === "retorno_en_curso";
    const targetKey = vaDeVuelta ? "origen" : "destino";
    let codigoEntrega = null;

    const guard = await validarCercaniaViaje({
        viaje: viajeActual,
        targetKey,
        maxDistanceMeters: FINISH_MAX_DISTANCE_METERS,
        missingTargetMessage: vaDeVuelta
            ? "Impossible de verifier l'origine de cette course."
            : "Impossible de verifier la destination de cette course.",
        farMessage: (distancia, limite) =>
            vaDeVuelta
                ? `Tu es encore a ${distancia} de l'origine. Rapproche-toi a ${limite} pour finaliser.`
                : `Tu es encore a ${distancia} de la destination. Rapproche-toi a ${limite} pour finaliser.`
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

    mostrarModalCobroRetornoCancelado(data);

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

function onRetornoPendiente(data = {}) {
    const viajeId = normalizarId(data.viajeId || getViajeEnCursoId());
    if (!viajeId) return;

    limpiarTimerFinalizacion(viajeId);
}

function onRetornoIniciado(data = {}) {
    const viajeId = normalizarId(data.viajeId || getViajeEnCursoId());
    if (!viajeId) return;

    limpiarTimerFinalizacion(viajeId);
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
