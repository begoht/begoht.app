const FINALIZADOS_KEY = "begoViajesFinalizados";
const PENDIENTE_KEY = "begoViajeFinalizadoPendiente";
const MAX_FINALIZADOS = 30;
const TTL_MS = 48 * 60 * 60 * 1000;

function safeJson(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeId(value) {
  return String(value || "").trim();
}

function now() {
  return Date.now();
}

function limpiarExpirados(items = []) {
  const limite = now() - TTL_MS;
  return items
    .filter((item) => item?.viajeId && Number(item.timestamp || 0) >= limite)
    .slice(0, MAX_FINALIZADOS);
}

function leerFinalizados() {
  return limpiarExpirados(safeJson(localStorage.getItem(FINALIZADOS_KEY), []));
}

function guardarFinalizados(items) {
  localStorage.setItem(FINALIZADOS_KEY, JSON.stringify(limpiarExpirados(items)));
}

export function getViajeIdFromPayload(payload = {}) {
  return normalizeId(
    payload.viajeId ||
    payload.id ||
    payload._id ||
    payload.viaje?._id ||
    payload.viaje?.id
  );
}

export function marcarViajeFinalizado(viajeId) {
  const id = normalizeId(viajeId);
  if (!id) return;

  const items = leerFinalizados().filter((item) => item.viajeId !== id);
  items.unshift({ viajeId: id, timestamp: now() });
  guardarFinalizados(items);

  const activo = safeJson(localStorage.getItem("viajeActivo"));
  if (!activo || !activo.viajeId || normalizeId(activo.viajeId) === id) {
    localStorage.removeItem("viajeActivo");
    sessionStorage.removeItem("viajeActivo");
  }
}

export function viajeFueFinalizado(viajeId) {
  const id = normalizeId(viajeId);
  if (!id) return false;

  const pendiente = obtenerFinalizacionPendiente();
  if (pendiente?.viajeId === id) return true;

  const items = leerFinalizados();
  guardarFinalizados(items);
  return items.some((item) => item.viajeId === id);
}

export function guardarFinalizacionPendiente(payload = {}) {
  const viajeId = getViajeIdFromPayload(payload);
  if (!viajeId) return null;

  const data = {
    ...payload,
    viajeId,
    timestamp: now(),
  };

  marcarViajeFinalizado(viajeId);
  localStorage.setItem(PENDIENTE_KEY, JSON.stringify(data));
  return data;
}

export function obtenerFinalizacionPendiente() {
  const data = safeJson(localStorage.getItem(PENDIENTE_KEY));
  if (!data?.viajeId) return null;

  if (Number(data.timestamp || 0) < now() - TTL_MS) {
    localStorage.removeItem(PENDIENTE_KEY);
    return null;
  }

  return data;
}

export function confirmarFinalizacionPendiente(viajeId) {
  const id = normalizeId(viajeId);
  const pendiente = obtenerFinalizacionPendiente();

  if (!pendiente || !id || pendiente.viajeId === id) {
    localStorage.removeItem(PENDIENTE_KEY);
  }

  if (id) marcarViajeFinalizado(id);
}
