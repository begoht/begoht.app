/*************************************************
 * 🔑 ESTADO GLOBAL
 *************************************************/
let viajeEnCursoId = null;
let viajeReservadoId = null; 
let estadoActualViaje = null;
export let viajesActivos = new Map();

export let llegadaLock = false;
export let llegadaRetryTimeout = null;

export function setLlegadaLock(val) { llegadaLock = val; }
export function setLlegadaRetryTimeout(val) { llegadaRetryTimeout = val; }

/*************************************************
 * GETTERS / SETTERS
 *************************************************/
export function getViajeEnCursoId() { return viajeEnCursoId; }
export function setViajeEnCurso(id) { viajeEnCursoId = id; }
export function getViajeReservadoId() { return viajeReservadoId; }
export function setViajeReservadoId(id) { viajeReservadoId = id; }
export function getEstadoViaje() { return estadoActualViaje; }
export function setEstadoViaje(nuevoEstado) { estadoActualViaje = nuevoEstado; }