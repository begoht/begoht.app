import { borrarRuta } from "../map.js";
import { 
    getEstadoViaje,
    getViajeReservadoId,
    setViajeEnCurso,
    setViajeReservadoId,
    setEstadoViaje,
    viajesActivos,
    llegadaRetryTimeout,
    setLlegadaRetryTimeout,
    setLlegadaLock
} from "./viajeEstado.js";

export function reconstruirUIDesdeEstado() {
    const estado = getEstadoViaje();
    const btnIniciar = document.getElementById("btnIniciarViaje");
    const btnFinalizar = document.getElementById("btnFinalizar");
    const estadoBox = document.getElementById("estadoViaje");
    const panel = document.getElementById("panelViajeControl");

    // 🔥 SI NO HAY ESTADO → OCULTAR TODO COMPLETAMENTE
    if (!estado) {
        if (btnIniciar) btnIniciar.style.display = "none";
        if (btnFinalizar) btnFinalizar.style.display = "none";
        if (panel) panel.style.display = "none";
        if (estadoBox) estadoBox.innerText = "🟢 Esperando viajes";
        return;
    }

    panel?.classList.remove("hidden");
    panel && (panel.style.display = "block");

    switch (estado) {

        case "reservado":
            estadoBox && (estadoBox.innerText = "📌 Tienes un viaje en cola");
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

            case "ofertando":
                // Mostrar caja de estado informativa
                if (estadoBox) estadoBox.innerText = "📋 Tienes una oferta pendiente...";
                if (panel) panel.style.display = "block";
                
                // Ocultar botones de acción de viaje activo
                if (btnIniciar) btnIniciar.style.display = "none";
                if (btnFinalizar) btnFinalizar.style.display = "none";
                
                // Aquí podrías forzar la apertura del modal de oferta si no está abierto
                break;

        case "asignado":
            estadoBox && (estadoBox.innerText = "🟡 En camino al pasajero");
            if (btnIniciar) {
                btnIniciar.style.display = "block";
                btnIniciar.disabled = false;
                btnIniciar.innerText = "📍 AVISAR LLEGADA";
                btnIniciar.classList.remove("btn-success");
                btnIniciar.classList.add("btn-warning");
            }
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "llego":
            estadoBox && (estadoBox.innerText = "🟢 Esperando pasajero...");
            if (btnIniciar) {
                btnIniciar.style.display = "block";
                btnIniciar.disabled = false;
                btnIniciar.innerText = "🚀 INICIAR TRAYECTO";
                btnIniciar.classList.remove("btn-warning");
                btnIniciar.classList.add("btn-success");
            }
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "en_curso":
            estadoBox && (estadoBox.innerText = "🚀 Viaje en curso al destino");
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "block";
            break;
    }
}

export function limpiarViajeMain(ui = {}) {
    console.log("🧼 Limpiando UI de viaje COMPLETO");

    if (typeof borrarRuta === "function") borrarRuta();

    setViajeEnCurso(null);
    setEstadoViaje(null);
    setLlegadaLock(false);

    viajesActivos.clear(); // 🔥 limpieza fuerte
    setViajeReservadoId(null);

    clearTimeout(llegadaRetryTimeout);
    setLlegadaRetryTimeout(null);

    import("../oferta/oferta.render.js").then(mod => {
        mod.limpiarOferta();
    }).catch(err => {
        console.warn("⚠️ No se pudo limpiar oferta:", err);
    });

    if (ui.btnIniciar) ui.btnIniciar.style.display = "none";
    if (ui.btnFinalizar) ui.btnFinalizar.style.display = "none";

    if (ui.panelControl) {
        ui.panelControl.style.display = "none";
    }

    if (ui.estadoBox) {
        ui.estadoBox.innerText = "🟢 Esperando viajes";
    }
}