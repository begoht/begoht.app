import {
    viajesActivos,
    getViajeEnCursoId,
    setViajeEnCurso
} from "./viajeControl/viajeEstado.js";

import { limpiarViajeMain } from "./viajeControl/viajeUI.js";
import { borrarRuta } from "./map.js";

const viajesFinalizadosProcesados = new Set();

export function initViajeFinalizar(socket) {
  const btnFinalizar = document.getElementById("btnFinalizar");
  const btnIniciar = document.getElementById("btnIniciarViaje");
  const estadoBox = document.getElementById("estadoViaje");
  const panelViajeControl = document.getElementById("panelViajeControl");

  document.addEventListener("click", (e) => {
    const target = e.target.closest("#btnFinalizar");
    if (!target || target.disabled) return;

    const viajeId = getViajeEnCursoId();
    if (!viajeId) {
        console.warn("No hay un ID de viaje activo para finalizar");
        return;
    }

    const viajeActual = viajesActivos.get(viajeId) || {};
    const esEnvio = viajeActual.tipo === "envio";
    let codigoEntrega = null;

    if (esEnvio) {
        codigoEntrega = window.prompt("Codigo de entrega de 4 digitos");
        codigoEntrega = String(codigoEntrega || "").replace(/\D/g, "").slice(0, 4);
        if (!/^\d{4}$/.test(codigoEntrega)) {
            alert("Ingresa el codigo de entrega de 4 digitos.");
            return;
        }
    } else if (!confirm("Deseas finalizar el viaje actual y cobrar?")) {
        return;
    }

    target.disabled = true;
    target.textContent = "Procesando...";

    const timerGuard = setTimeout(() => {
        if (target.textContent === "Procesando...") {
            target.disabled = false;
            target.textContent = esEnvio ? "CONFIRMAR ENTREGA" : "FINALIZAR VIAJE";
            console.error("Tiempo de espera agotado al finalizar viaje.");
        }
    }, 8000);

    console.log("Enviando finalizar-viaje para:", viajeId);
    socket.emit("finalizar-viaje", {
        viajeId,
        codigoEntrega,
        motoristaId: socket.user?._id || socket.user?.id
    });

    target.dataset.timerId = timerGuard;
  });

  socket.on("viaje-finalizado", (data) => {
    const idFinalizado = data.viajeId || data.id;
    const viajeActivo = getViajeEnCursoId();

    if (!idFinalizado || idFinalizado !== viajeActivo) {
        console.warn("Finalizacion ignorada para viaje no activo:", idFinalizado);
        return;
    }

    if (idFinalizado && viajesFinalizadosProcesados.has(idFinalizado)) return;
    if (idFinalizado) viajesFinalizadosProcesados.add(idFinalizado);
    console.log("Confirmacion de fin de viaje recibida:", idFinalizado);

    const btn = document.getElementById("btnFinalizar");
    if (btn && btn.dataset.timerId) {
        clearTimeout(parseInt(btn.dataset.timerId));
        btn.textContent = "FINALIZAR VIAJE";
        btn.disabled = false;
    }

    if (typeof Toastify !== "undefined") {
        const esEnvio = data?.viaje?.tipo === "envio";
        Toastify({
            text: `${esEnvio ? "Entrega finalizada" : "Viaje finalizado"}\nCobrar: ${data.total || 0} G`,
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
        btnIniciar,
        btnFinalizar,
        estadoBox,
        panelControl: panelViajeControl
    });

    if (typeof borrarRuta === "function") borrarRuta();

    window.dispatchEvent(new CustomEvent("driver:trip-finalized", { detail: data }));
  });

  socket.on("error-finalizar", (err) => {
    alert("Error: " + (err.msg || "No se pudo finalizar el viaje"));
    const btn = document.getElementById("btnFinalizar");
    if (btn) {
        const viajeId = getViajeEnCursoId();
        const esEnvio = viajeId && viajesActivos.get(viajeId)?.tipo === "envio";
        btn.disabled = false;
        btn.textContent = esEnvio ? "CONFIRMAR ENTREGA" : "FINALIZAR VIAJE";
        if (btn.dataset.timerId) clearTimeout(parseInt(btn.dataset.timerId));
    }
  });
}
