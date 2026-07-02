// oferta.state.js

export const ofertaState = {
  viajeActual: null, // Centralizado aquí
  socketRef: null,
  lastDecisionTs: 0,
  intervalo: null,
  aceptando: false,
  initialized: false,
  failSafeTimer: null
};

export const ofertaQueue = [];
export const seenOfertas = new Set();

export const CONFIG = {
  MAX_QUEUE: 5,
  DECISION_COOLDOWN: 1200,
  DEDUPLICACION_TTL: 60000,
  FAILSAFE_TIMEOUT: 12000
};

// Helpers para actualizar el estado correctamente
export const setViajeActual = (v) => { ofertaState.viajeActual = v; };
export const setSocketRef = (s) => { ofertaState.socketRef = s; };
export const setLastDecision = (ts) => { ofertaState.lastDecisionTs = ts; };
export const getViajeId = (v) => {
  if (typeof v === "string" || typeof v === "number") return String(v);
  const id = v?.viajeId ?? v?._id ?? v?.id ?? null;
  return id == null ? null : String(id);
};

export function getOfertaExpiraEn(viaje, now = Date.now()) {
  const expira = Number(viaje?.expira);
  if (Number.isFinite(expira)) return expira;

  const ttl = Number(viaje?.ttl);
  return Number.isFinite(ttl) && ttl > 0 ? now + ttl : now + 15000;
}
