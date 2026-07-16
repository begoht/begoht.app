import {
    setEstadoViaje,
    getEstadoViaje,
    getViajeEnCursoId,
    setViajeEnCurso,
    setViajeReservadoId,
    viajesActivos,
    restaurarViajeEstado,
    persistirViajeEstado,
    limpiarViajePersistido
} from "../viajeControl/viajeEstado.js";
import { reconstruirUIDesdeEstado } from "../viajeControl/viajeUI.js?v=20260711-trip-ui-split";
import { getUltimaPosicion, refreshDriverLocation } from "../gps.js?v=20260716-live-trip-tracking";
import { redibujarRutaRecovery } from "./viajeInicioUI.js?v=20260623-roundtrip-v2";

let ultimoSyncProcesado = null;
let ultimoSyncTs = 0;
let lifecycleBound = false;
let gpsRedrawBound = false;
let socketRef = null;

const ESTADOS_TERMINALES = new Set(["finalizado", "cancelado", "libre"]);

export function initViajeRecovery(socket) {
    if (!socket) return;

    socketRef = socket;

    socket.off("sync-viaje");
    socket.off("sync-reserva");

    socket.on("sync-viaje", procesarSyncViaje);
    socket.on("sync-reserva", procesarSyncReserva);

    bindLifecycleRecovery();
    bindGpsRedraw();

    if (restaurarViajeEstado()) {
        reconstruirUIDesdeEstado();
        redibujarRutaActual();
        refreshDriverLocation({ force: true }).finally(redibujarRutaActual);
    }

    pedirSyncServidor();
}

export function redibujarRutaActual() {
    const viajeId = getViajeEnCursoId();
    if (!viajeId) return false;

    const viaje =
        viajesActivos.get(String(viajeId)) ||
        viajesActivos.get(viajeId);

    if (!viaje) return false;

    const estado = viaje.estado || getEstadoViaje();
    const pos = getUltimaPosicion();

    if (!estado || !pos) return false;

    redibujarRutaRecovery(estado, viaje, pos);
    return true;
}

function procesarSyncViaje(data = {}) {
    const estado = normalizarEstado(data.estado);
    const viajeId = normalizarId(data.viajeId || data._id || data.id);

    if (!viajeId && estado === "libre") {
        limpiarViajePersistido();
        reconstruirUIDesdeEstado();
        return;
    }

    if (!viajeId) return;

    const ahora = Date.now();

    if (
        ultimoSyncProcesado === `${viajeId}:${estado}` &&
        (ahora - ultimoSyncTs < 1500)
    ) {
        console.log("Sync duplicado ignorado:", viajeId);
        return;
    }

    ultimoSyncProcesado = `${viajeId}:${estado}`;
    ultimoSyncTs = ahora;

    if (ESTADOS_TERMINALES.has(estado)) {
        viajesActivos.delete(viajeId);

        if (String(getViajeEnCursoId()) === String(viajeId)) {
            setViajeEnCurso(null);
            setEstadoViaje(null);
        }

        if (!viajesActivos.size) {
            limpiarViajePersistido();
        } else {
            persistirViajeEstado();
        }

        reconstruirUIDesdeEstado();
        return;
    }

    const viaje = normalizarViajeData({ ...data, estado, viajeId });
    viajesActivos.set(viajeId, {
        ...(viajesActivos.get(viajeId) || {}),
        ...viaje
    });

    if (data.tipo === "reserva" || estado === "reservado") {
        setViajeReservadoId(viajeId);

        if (!getViajeEnCursoId()) {
            setEstadoViaje("reservado");
        }
    } else if (
        data.tipo === "principal" ||
        !getViajeEnCursoId() ||
        String(getViajeEnCursoId()) === String(viajeId)
    ) {
        setViajeEnCurso(viajeId);
        setEstadoViaje(estado);
    }

    persistirViajeEstado();
    reconstruirUIDesdeEstado();
    redibujarRutaActual();

    if (estado === "llego") {
        console.log("Motorista marcado como llegado en recovery:", viajeId);
    }
}

function procesarSyncReserva(data = {}) {
    const viajeId = normalizarId(data.viajeId || data._id || data.id);
    if (!viajeId) return;

    setViajeReservadoId(viajeId);

    if (data.origen || data.destino || data.estado) {
        viajesActivos.set(viajeId, normalizarViajeData({
            ...data,
            viajeId,
            estado: data.estado || "reservado",
            tipo: "reserva",
            esReserva: true
        }));
    }

    if (!getViajeEnCursoId()) {
        setEstadoViaje("reservado");
    }

    persistirViajeEstado();
    reconstruirUIDesdeEstado();
}

function bindLifecycleRecovery() {
    if (lifecycleBound) return;
    lifecycleBound = true;

    const onForeground = () => {
        if (document.visibilityState && document.visibilityState !== "visible") return;

        restaurarViajeEstado();
        reconstruirUIDesdeEstado();
        refreshDriverLocation({ force: true }).finally(redibujarRutaActual);
        pedirSyncServidor();
    };

    document.addEventListener("visibilitychange", onForeground);
    window.addEventListener("focus", onForeground);
    window.addEventListener("online", onForeground);

    const appPlugin = window.Capacitor?.Plugins?.App;
    if (appPlugin?.addListener) {
        const bind = (eventName, handler) => {
            try {
                const result = appPlugin.addListener(eventName, handler);
                result?.catch?.(() => {});
            } catch {}
        };

        bind("appStateChange", (state) => {
            if (state?.isActive) onForeground();
        });
        bind("resume", onForeground);
    }
}

function bindGpsRedraw() {
    if (gpsRedrawBound) return;
    gpsRedrawBound = true;

    window.addEventListener("driver:gps-position", () => {
        redibujarRutaActual();
    });
}

function pedirSyncServidor() {
    if (!socketRef) return;

    if (!socketRef.connected) {
        socketRef.connect?.();
        return;
    }

    socketRef.emit("sync-solicitado");
}

function normalizarViajeData(viaje = {}) {
    const viajeId = normalizarId(viaje.viajeId || viaje._id || viaje.id);

    return {
        ...viaje,
        id: viajeId,
        viajeId,
        estado: normalizarEstado(viaje.estado)
    };
}

function normalizarEstado(estado) {
    if (!estado) return null;
    return String(estado);
}

function normalizarId(id) {
    if (id == null) return null;

    const value = String(id).trim();
    if (!value || value === "null" || value === "undefined") return null;
    return value;
}
