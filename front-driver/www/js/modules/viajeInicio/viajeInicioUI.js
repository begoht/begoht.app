import { borrarRuta, dibujarRutaPremium } from "../map.js?v=20260610-route-consume";
import { setViajeEnCurso, setEstadoViaje,viajesActivos,setViajeReservadoId} from "../viajeControl/viajeEstado.js";
import { reconstruirUIDesdeEstado } from "../viajeControl/viajeUI.js?v=20260610-route-consume";
import { llegadaTimeout } from "./viajeInicioEstado.js";

export const limpiarInterfazViaje = (detenerSimulacionETA) => {
    console.log("🧹 Limpieza total de interfaz");

    // 🔥 Reset de estado
    setViajeEnCurso(null);
    setEstadoViaje(null);
    setViajeReservadoId(null);
    rutaActiva.viajeId = null;
    rutaActiva.tipo = null;

    // 🔥 Limpieza del mapa de viajes
    viajesActivos.clear();

    if (typeof borrarRuta === "function") borrarRuta();

    detenerSimulacionETA?.();
    clearTimeout(llegadaTimeout);

    reconstruirUIDesdeEstado();
};

let rutaActiva = {
    viajeId: null,
    tipo: null // "origen" | "destino"
};

export const redibujarRutaRecovery = (estado, data, pos) => {
    if (!pos || !data?.viajeId) return;

    const viajeId = data.viajeId;

    let tipoRuta = null;
    let punto = null;

    if ((estado === "asignado" || estado === "llego") && data.origen) {
        tipoRuta = "origen";
        punto = data.origen;
    }

    if (estado === "en_curso" && data.destino) {
        tipoRuta = "destino";
        punto = data.destino;
    }

    if (!tipoRuta || !punto) return;

    // 🛡️ ANTI REDIBUJO
    if (
        rutaActiva.viajeId === viajeId &&
        rutaActiva.tipo === tipoRuta
    ) {
        console.log("🛑 Ruta ya dibujada, ignorando");
        return;
    }

    // 🔄 Guardar estado actual
    rutaActiva = {
        viajeId,
        tipo: tipoRuta
    };

    console.log(`🗺️ Dibujando ruta (${tipoRuta}) recovery: ${estado}`);

    dibujarRutaPremium(pos, punto);
};
