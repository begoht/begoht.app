import { borrarRuta, dibujarRutaPremium } from "../map.js?v=20260710-route-icons";
import { setViajeEnCurso, setEstadoViaje,viajesActivos,setViajeReservadoId} from "../viajeControl/viajeEstado.js";
import { reconstruirUIDesdeEstado } from "../viajeControl/viajeUI.js?v=20260710-photo-fix";
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

    if (estado === "en_curso") {
        const vaDeVuelta = data.idaVuelta?.estado === "retorno_en_curso";
        punto = vaDeVuelta ? (data.proximoDestino || data.origen) : (data.proximoDestino || data.destino);
        tipoRuta = vaDeVuelta ? "retorno" : "destino";
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
