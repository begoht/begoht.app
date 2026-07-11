import { getEstadoViaje } from "./viajeEstado.js";
import { actualizarDetalleViaje } from "./viajeRender.js?v=20260711-trip-render";
import { obtenerViajeActualUI } from "./viajeSelectors.js?v=20260711-trip-selectors";
import { inicializarSheetExpandible } from "./viajeSheet.js?v=20260711-trip-sheet";

let botonesAccionInicializados = false;
let gpsUiListenerInicializado = false;

export function inicializarAccionesViaje() {
    if (botonesAccionInicializados) return;
    botonesAccionInicializados = true;
    inicializarSheetExpandible();
    inicializarActualizacionGpsPanel();
    inicializarBotonLlamar();
}

function inicializarActualizacionGpsPanel() {
    if (gpsUiListenerInicializado) return;
    gpsUiListenerInicializado = true;

    window.addEventListener("driver:gps-position", () => {
        const estado = getEstadoViaje();
        const viaje = obtenerViajeActualUI();
        if (!estado || !viaje) return;
        actualizarDetalleViaje(viaje, estado);
    });
}

function inicializarBotonLlamar() {
    document.getElementById("btnViajeLlamar")?.addEventListener("click", () => {
        const viaje = obtenerViajeActualUI();
        const pasajero = typeof viaje?.pasajero === "object" ? viaje.pasajero : {};
        const tel = pasajero.telefono || pasajero.phone || viaje?.telefonoPasajero || viaje?.pasajeroTelefono;
        if (tel) window.location.href = `tel:${tel}`;
    });
}
