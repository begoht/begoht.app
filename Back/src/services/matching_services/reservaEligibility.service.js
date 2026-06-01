const Viaje = require("../../models/Viaje");
const { redis } = require("../../config/redis");
const { calcularDistanciaMetros } = require("../../utils/geo");

const RESERVA_MAX_DISTANCIA_METROS = 500;
const ESTADOS_RESERVA_PERMITIDOS = new Set(["en_curso"]);

function normalizarId(value) {
  if (!value || value === "null" || value === "undefined") return null;
  return String(value);
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function obtenerPosicionMotorista(motoristaId, data = {}) {
  let lat = safeNumber(data.lat);
  let lng = safeNumber(data.lng);

  if (lat != null && lng != null) {
    return { lat, lng };
  }

  const raw = await redis.get(`motorista:pos:${motoristaId}`);
  const pos = parseJson(raw);
  lat = safeNumber(pos?.lat);
  lng = safeNumber(pos?.lng);

  return lat != null && lng != null ? { lat, lng } : null;
}

async function obtenerDestinoActual(viajeActualId) {
  const ctx = parseJson(await redis.get(`viaje:ctx:${viajeActualId}`));
  const destinoCtx = ctx?.destino;

  if (destinoCtx?.lat != null && destinoCtx?.lng != null) {
    return destinoCtx;
  }

  const viaje = await Viaje.findOne({
    _id: viajeActualId,
    estado: "en_curso"
  })
    .select("destino")
    .lean();

  return viaje?.destino || null;
}

async function evaluarElegibilidadReserva({
  motoristaId,
  data = {},
  tieneReserva = false,
  maxDistanciaMetros = RESERVA_MAX_DISTANCIA_METROS
}) {
  const viajeActualId = normalizarId(data.viajeActualId);
  const estadoInterno = String(data.estadoInterno || "").toLowerCase();

  if (!viajeActualId) {
    return { permitir: false, reason: "sin_viaje_actual" };
  }

  if (tieneReserva) {
    return { permitir: false, reason: "ya_tiene_reserva" };
  }

  if (!ESTADOS_RESERVA_PERMITIDOS.has(estadoInterno)) {
    return { permitir: false, reason: "estado_no_permite_reserva" };
  }

  const [posicion, destinoActual] = await Promise.all([
    obtenerPosicionMotorista(motoristaId, data),
    obtenerDestinoActual(viajeActualId)
  ]);

  if (!posicion || destinoActual?.lat == null || destinoActual?.lng == null) {
    return { permitir: false, reason: "sin_gps_o_destino" };
  }

  const metros = calcularDistanciaMetros(
    posicion.lat,
    posicion.lng,
    Number(destinoActual.lat),
    Number(destinoActual.lng)
  );

  if (!Number.isFinite(metros)) {
    return { permitir: false, reason: "distancia_invalida" };
  }

  const distanciaMetros = Math.round(metros);
  const distanciaKm = Number((distanciaMetros / 1000).toFixed(3));

  return {
    permitir: distanciaMetros <= maxDistanciaMetros,
    reason: distanciaMetros <= maxDistanciaMetros ? "ok" : "lejos_del_destino_actual",
    distanciaMetros,
    kmRestantes: distanciaKm,
    destinoActual
  };
}

module.exports = {
  RESERVA_MAX_DISTANCIA_METROS,
  evaluarElegibilidadReserva
};
