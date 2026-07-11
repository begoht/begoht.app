import {
    getEstadoViaje,
    getViajeEnCursoId,
    getViajeReservadoId,
    viajesActivos
} from "./viajeEstado.js";

export function obtenerViajeActualUI() {
    const viajeId = getViajeEnCursoId();
    if (viajeId && viajesActivos.has(String(viajeId))) {
        return viajesActivos.get(String(viajeId));
    }

    if (viajeId && viajesActivos.has(viajeId)) {
        return viajesActivos.get(viajeId);
    }

    const activo = Array.from(viajesActivos.values()).find(viaje =>
        ["asignado", "llego", "en_curso"].includes(viaje?.estado)
    );
    if (activo) return activo;

    const reservado = obtenerViajeReservadoUI();
    if (reservado && getEstadoViaje() === "reservado") return reservado;

    return null;
}

export function obtenerViajeReservadoUI() {
    const reservadoId = getViajeReservadoId();
    if (reservadoId && viajesActivos.has(String(reservadoId))) {
        return viajesActivos.get(String(reservadoId));
    }

    if (reservadoId && viajesActivos.has(reservadoId)) {
        return viajesActivos.get(reservadoId);
    }

    return Array.from(viajesActivos.values()).find(viaje =>
        viaje?.estado === "reservado" || viaje?.esReserva === true || viaje?.tipo === "reserva"
    ) || null;
}
