const DRIVER_TRIP_STATE_KEY = "driver:viaje-state";
const DRIVER_TRIP_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let viajeEnCursoId = null;
let viajeReservadoId = null;
let estadoActualViaje = null;
let restaurandoEstadoPersistido = false;
let persistTimer = null;

export let viajesActivos = crearMapaPersistente();

export let llegadaLock = false;
export let llegadaRetryTimeout = null;

export function setLlegadaLock(val) { llegadaLock = val; }
export function setLlegadaRetryTimeout(val) { llegadaRetryTimeout = val; }

export function getViajeEnCursoId() { return viajeEnCursoId; }
export function getViajeReservadoId() { return viajeReservadoId; }
export function getEstadoViaje() { return estadoActualViaje; }

export function setViajeEnCurso(id) {
    viajeEnCursoId = normalizarId(id);
    guardarLegacyViajeEnCurso(viajeEnCursoId);
    programarPersistencia();
}

export function setViajeReservadoId(id) {
    viajeReservadoId = normalizarId(id);
    programarPersistencia();
}

export function setEstadoViaje(nuevoEstado) {
    estadoActualViaje = nuevoEstado || null;
    programarPersistencia();
}

export function persistirViajeEstado() {
    if (!puedeUsarStorage()) return;

    clearTimeout(persistTimer);
    persistTimer = null;

    const viajes = Array.from(viajesActivos.entries())
        .map(([id, viaje]) => [String(id), normalizarViaje(viaje, id)])
        .filter(([, viaje]) => viaje);

    const hayEstado =
        viajeEnCursoId ||
        viajeReservadoId ||
        estadoActualViaje ||
        viajes.length > 0;

    try {
        if (!hayEstado) {
            localStorage.removeItem(DRIVER_TRIP_STATE_KEY);
            localStorage.removeItem("viajeEnCursoId");
            return;
        }

        localStorage.setItem(DRIVER_TRIP_STATE_KEY, JSON.stringify({
            viajeEnCursoId,
            viajeReservadoId,
            estadoActualViaje,
            viajesActivos: viajes,
            savedAt: Date.now()
        }));
    } catch (err) {
        console.warn("No se pudo guardar el viaje del motorista:", err);
    }
}

export function restaurarViajeEstado() {
    if (!puedeUsarStorage()) return false;

    const raw = localStorage.getItem(DRIVER_TRIP_STATE_KEY);
    if (!raw) return false;

    try {
        const data = JSON.parse(raw);
        const savedAt = Number(data?.savedAt || 0);

        if (!data || (savedAt && Date.now() - savedAt > DRIVER_TRIP_STATE_MAX_AGE_MS)) {
            limpiarViajePersistido();
            return false;
        }

        const entradas = Array.isArray(data.viajesActivos) ? data.viajesActivos : [];

        restaurandoEstadoPersistido = true;
        viajesActivos.clear();

        entradas.forEach(([id, viaje]) => {
            const viajeNormalizado = normalizarViaje(viaje, id);
            if (viajeNormalizado) {
                viajesActivos.set(viajeNormalizado.viajeId, viajeNormalizado);
            }
        });

        viajeEnCursoId =
            normalizarId(data.viajeEnCursoId) ||
            encontrarPrimerViajeActivo();
        viajeReservadoId = normalizarId(data.viajeReservadoId);
        estadoActualViaje =
            data.estadoActualViaje ||
            viajesActivos.get(viajeEnCursoId)?.estado ||
            null;

        guardarLegacyViajeEnCurso(viajeEnCursoId);

        return !!(viajeEnCursoId || viajeReservadoId || viajesActivos.size);
    } catch (err) {
        console.warn("No se pudo restaurar el viaje del motorista:", err);
        limpiarViajePersistido();
        return false;
    } finally {
        restaurandoEstadoPersistido = false;
    }
}

export function limpiarViajePersistido() {
    restaurandoEstadoPersistido = true;
    viajeEnCursoId = null;
    viajeReservadoId = null;
    estadoActualViaje = null;
    viajesActivos.clear();
    restaurandoEstadoPersistido = false;

    if (!puedeUsarStorage()) return;

    try {
        localStorage.removeItem(DRIVER_TRIP_STATE_KEY);
        localStorage.removeItem("viajeEnCursoId");
    } catch {}
}

function crearMapaPersistente() {
    const mapa = new Map();
    const setOriginal = mapa.set.bind(mapa);
    const deleteOriginal = mapa.delete.bind(mapa);
    const clearOriginal = mapa.clear.bind(mapa);

    mapa.set = (key, value) => {
        const id = normalizarId(key);
        if (!id) return mapa;

        const result = setOriginal(id, normalizarViaje(value, id) || value);
        programarPersistencia();
        return result;
    };

    mapa.delete = (key) => {
        const result = deleteOriginal(normalizarId(key) || key);
        programarPersistencia();
        return result;
    };

    mapa.clear = () => {
        const result = clearOriginal();
        programarPersistencia();
        return result;
    };

    return mapa;
}

function programarPersistencia() {
    if (restaurandoEstadoPersistido || !puedeUsarStorage()) return;

    clearTimeout(persistTimer);
    persistTimer = setTimeout(persistirViajeEstado, 0);
}

function normalizarViaje(viaje = {}, fallbackId = null) {
    const id = normalizarId(viaje?.viajeId || viaje?._id || viaje?.id || fallbackId);
    if (!id || !viaje || typeof viaje !== "object") return null;

    return {
        ...viaje,
        id,
        viajeId: id,
        estado: viaje.estado || null
    };
}

function encontrarPrimerViajeActivo() {
    for (const [id, viaje] of viajesActivos.entries()) {
        if (["asignado", "llego", "en_curso", "ofertando"].includes(viaje?.estado)) {
            return id;
        }
    }

    return null;
}

function normalizarId(id) {
    if (id == null) return null;

    const value = String(id).trim();
    if (!value || value === "null" || value === "undefined") return null;
    return value;
}

function guardarLegacyViajeEnCurso(id) {
    if (!puedeUsarStorage()) return;

    try {
        if (id) {
            localStorage.setItem("viajeEnCursoId", id);
        } else {
            localStorage.removeItem("viajeEnCursoId");
        }
    } catch {}
}

function puedeUsarStorage() {
    return typeof localStorage !== "undefined";
}
