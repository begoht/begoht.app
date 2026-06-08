import { borrarRuta } from "../map.js?v=20260606-recenter-map";
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

    if (!estado) {
        if (btnIniciar) btnIniciar.style.display = "none";
        if (btnFinalizar) btnFinalizar.style.display = "none";
        if (panel) panel.style.display = "none";
        if (estadoBox) estadoBox.innerText = "En attente de courses";
        return;
    }

    panel?.classList.remove("hidden");
    panel && (panel.style.display = "block");

    switch (estado) {
        case "reservado":
            estadoBox && (estadoBox.innerText = "Course en file");
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "ofertando":
            if (estadoBox) estadoBox.innerText = "Offre en attente...";
            if (panel) panel.style.display = "block";
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "asignado":
            estadoBox && (estadoBox.innerText = "En route vers le passager");
            if (btnIniciar) {
                btnIniciar.style.display = "block";
                btnIniciar.disabled = false;
                btnIniciar.innerText = "Aviser l'arrivee";
                btnIniciar.classList.remove("btn-success");
                btnIniciar.classList.add("btn-warning");
            }
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "llego":
            estadoBox && (estadoBox.innerText = "Passager en attente...");
            if (btnIniciar) {
                btnIniciar.style.display = "block";
                btnIniciar.disabled = false;
                btnIniciar.innerText = "Demarrer le trajet";
                btnIniciar.classList.remove("btn-warning");
                btnIniciar.classList.add("btn-success");
            }
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "en_curso": {
            const viajeActual = Array.from(viajesActivos.values()).find(viaje => viaje?.estado === "en_curso") || null;
            const esEnvio = viajeActual?.tipo === "envio";
            estadoBox && (estadoBox.innerText = esEnvio ? "Livraison en cours - demandez le code" : "Course en cours vers destination");
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) {
                btnFinalizar.style.display = "block";
                btnFinalizar.innerText = esEnvio ? "Confirmer livraison" : "Finaliser la course";
            }
            break;
        }
    }
}

export function limpiarViajeMain(ui = {}) {
    console.log("Limpiando UI de viaje COMPLETO");

    if (typeof borrarRuta === "function") borrarRuta();

    setViajeEnCurso(null);
    setEstadoViaje(null);
    setLlegadaLock(false);

    viajesActivos.clear();
    setViajeReservadoId(null);

    clearTimeout(llegadaRetryTimeout);
    setLlegadaRetryTimeout(null);

    import("../oferta/oferta.render.js?v=20260602-offer-ui-singleton").then(mod => {
        mod.limpiarOferta();
    }).catch(err => {
        console.warn("No se pudo limpiar oferta:", err);
    });

    if (ui.btnIniciar) ui.btnIniciar.style.display = "none";
    if (ui.btnFinalizar) ui.btnFinalizar.style.display = "none";

    if (ui.panelControl) {
        ui.panelControl.style.display = "none";
    }

    if (ui.estadoBox) {
        ui.estadoBox.innerText = "En attente de courses";
    }
}
