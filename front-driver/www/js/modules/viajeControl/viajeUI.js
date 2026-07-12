import { borrarRuta } from "../map.js?v=20260712-voyager-menu-toggle";
import {
    getEstadoViaje,
    setViajeEnCurso,
    setViajeReservadoId,
    setEstadoViaje,
    viajesActivos,
    llegadaRetryTimeout,
    setLlegadaRetryTimeout,
    setLlegadaLock
} from "./viajeEstado.js";
import { inicializarAccionesViaje } from "./viajeEvents.js?v=20260711-trip-events";
import {
    actualizarBotonCobro,
    actualizarDetalleViaje,
    actualizarResumenReserva
} from "./viajeRender.js?v=20260711-trip-render";
import { obtenerViajeActualUI } from "./viajeSelectors.js?v=20260711-trip-selectors";
import { mostrarPanelViaje, ocultarPanelViaje } from "./viajeSheet.js?v=20260711-trip-sheet";

export function reconstruirUIDesdeEstado() {
    const estado = getEstadoViaje();
    const btnIniciar = document.getElementById("btnIniciarViaje");
    const btnFinalizar = document.getElementById("btnFinalizar");
    const btnIniciarVuelta = document.getElementById("btnIniciarVuelta");
    const btnAnularVuelta = document.getElementById("btnAnularVuelta");
    const btnBuscarSiguiente = document.getElementById("btnBuscarSiguienteViaje");
    const estadoBox = document.getElementById("estadoViaje");
    const panel = document.getElementById("panelViajeControl");
    const viajeActual = obtenerViajeActualUI();
    const estadoIdaVuelta = viajeActual?.idaVuelta?.estado || "";
    inicializarAccionesViaje();
    actualizarResumenReserva();

    if (!estado) {
        ocultarControlesActivos({ btnIniciar, btnFinalizar, btnIniciarVuelta, btnAnularVuelta, btnBuscarSiguiente });
        ocultarPanelViaje(panel);
        document.body.classList.remove("driver-trip-active");
        if (estadoBox) estadoBox.innerText = "En attente de courses";
        actualizarBotonCobro(null, null);
        actualizarDetalleViaje(null, null);
        actualizarResumenReserva();
        return;
    }

    panel?.classList.remove("hidden");
    mostrarPanelViaje(panel);
    document.body.classList.add("driver-trip-active");
    actualizarBotonCobro(viajeActual, estado);
    actualizarDetalleViaje(viajeActual, estado);
    actualizarResumenReserva();
    ocultarControlesSecundarios({ btnIniciarVuelta, btnAnularVuelta, btnBuscarSiguiente });

    renderEstadoViaje({
        estado,
        estadoIdaVuelta,
        viajeActual,
        btnIniciar,
        btnFinalizar,
        btnBuscarSiguiente,
        panel,
        estadoBox
    });
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

    import("../oferta/oferta.render.js?v=20260702-offer-recovery").then(mod => {
        mod.limpiarOferta();
    }).catch(err => {
        console.warn("No se pudo limpiar oferta:", err);
    });

    if (ui.btnIniciar) ui.btnIniciar.style.display = "none";
    if (ui.btnFinalizar) ui.btnFinalizar.style.display = "none";
    document.getElementById("btnIniciarVuelta")?.style && (document.getElementById("btnIniciarVuelta").style.display = "none");
    document.getElementById("btnAnularVuelta")?.style && (document.getElementById("btnAnularVuelta").style.display = "none");
    document.getElementById("btnBuscarSiguienteViaje")?.style && (document.getElementById("btnBuscarSiguienteViaje").style.display = "none");
    actualizarBotonCobro(null, null);
    actualizarDetalleViaje(null, null);

    if (ui.panelControl) {
        ocultarPanelViaje(ui.panelControl);
    }
    document.body.classList.remove("driver-trip-active");

    if (ui.estadoBox) {
        ui.estadoBox.innerText = "En attente de courses";
    }
}

function renderEstadoViaje({
    estado,
    estadoIdaVuelta,
    viajeActual,
    btnIniciar,
    btnFinalizar,
    btnBuscarSiguiente,
    panel,
    estadoBox
}) {
    switch (estado) {
        case "reservado":
            estadoBox && (estadoBox.innerText = "Viaje en cola");
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "ofertando":
            if (estadoBox) estadoBox.innerText = "Oferta en espera...";
            mostrarPanelViaje(panel);
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "asignado":
            estadoBox && (estadoBox.innerText = "En camino al pasajero");
            configurarBotonPrincipal(btnIniciar, {
                label: "LLEGUE AL PUNTO DE RECOGIDA",
                icon: "fa-location-dot",
                add: "btn-warning",
                remove: "btn-success"
            });
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "llego":
            estadoBox && (estadoBox.innerText = "Pasajero en espera");
            configurarBotonPrincipal(btnIniciar, {
                label: "INICIAR VIAJE",
                icon: "fa-play",
                add: "btn-success",
                remove: "btn-warning"
            });
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "en_curso":
            renderViajeEnCurso({ viajeActual, estadoIdaVuelta, btnIniciar, btnFinalizar, estadoBox });
            break;

        case "completado":
        case "finalizado":
            estadoBox && (estadoBox.innerText = "Viaje completado");
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "none";
            configurarBotonBuscarSiguiente(btnBuscarSiguiente, { btnIniciar, btnFinalizar, panel, estadoBox });
            break;
    }
}

function renderViajeEnCurso({ viajeActual, estadoIdaVuelta, btnIniciar, btnFinalizar, estadoBox }) {
    const esEnvio = viajeActual?.tipo === "envio";
    if (estadoIdaVuelta === "retorno_pendiente") {
        estadoBox && (estadoBox.innerText = "En attente de la decision du passager");
        if (btnIniciar) btnIniciar.style.display = "none";
        if (btnFinalizar) btnFinalizar.style.display = "none";
        document.getElementById("btnIniciarVuelta")?.style && (document.getElementById("btnIniciarVuelta").style.display = "none");
        document.getElementById("btnAnularVuelta")?.style && (document.getElementById("btnAnularVuelta").style.display = "none");
        return;
    }

    const vaDeVuelta = estadoIdaVuelta === "retorno_en_curso";
    estadoBox && (estadoBox.innerText = vaDeVuelta
        ? "Vuelta en curso al origen"
        : esEnvio ? "Entrega en curso - pide el codigo" : "Viaje en curso a destino");
    if (btnIniciar) btnIniciar.style.display = "none";
    if (btnFinalizar) {
        btnFinalizar.style.display = "flex";
        btnFinalizar.innerHTML = `<i class="fa-solid fa-flag-checkered" aria-hidden="true"></i> ${vaDeVuelta ? "FINALIZAR VUELTA" : esEnvio ? "CONFIRMAR ENTREGA" : "FINALIZAR VIAJE"}`;
    }
}

function configurarBotonPrincipal(btn, { label, icon, add, remove }) {
    if (!btn) return;
    btn.style.display = "flex";
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i> ${label}`;
    btn.classList.remove(remove);
    btn.classList.add(add);
}

function configurarBotonBuscarSiguiente(btnBuscarSiguiente, { btnIniciar, btnFinalizar, panel, estadoBox }) {
    if (!btnBuscarSiguiente) return;
    btnBuscarSiguiente.style.display = "flex";
    btnBuscarSiguiente.onclick = () => limpiarViajeMain({
        btnIniciar,
        btnFinalizar,
        panelControl: panel,
        estadoBox
    });
}

function ocultarControlesActivos({ btnIniciar, btnFinalizar, btnIniciarVuelta, btnAnularVuelta, btnBuscarSiguiente }) {
    if (btnIniciar) btnIniciar.style.display = "none";
    if (btnFinalizar) btnFinalizar.style.display = "none";
    ocultarControlesSecundarios({ btnIniciarVuelta, btnAnularVuelta, btnBuscarSiguiente });
}

function ocultarControlesSecundarios({ btnIniciarVuelta, btnAnularVuelta, btnBuscarSiguiente }) {
    if (btnIniciarVuelta) btnIniciarVuelta.style.display = "none";
    if (btnAnularVuelta) btnAnularVuelta.style.display = "none";
    if (btnBuscarSiguiente) btnBuscarSiguiente.style.display = "none";
}
