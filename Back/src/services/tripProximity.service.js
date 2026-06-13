const { redis } = require("../config/redis");
const { calcularDistanciaMetros } = require("../utils/geo");

const ARRIVAL_MAX_DISTANCE_METERS = Number(process.env.TRIP_ARRIVAL_MAX_DISTANCE_METERS || 150);
const FINISH_MAX_DISTANCE_METERS = Number(process.env.TRIP_FINISH_MAX_DISTANCE_METERS || 180);
const POSITION_MAX_AGE_MS = Number(process.env.TRIP_PROXIMITY_POSITION_MAX_AGE_MS || 180000);

async function validarCercaniaMotorista({
  motoristaId,
  target,
  fallbackPosition = null,
  maxDistanceMeters,
  code,
  message
}) {
  const destino = normalizarPunto(target);

  if (!destino) {
    throw crearError({
      code: `${code}_SIN_DESTINO`,
      message: "No se pudo validar el punto del viaje."
    });
  }

  const posicion = await obtenerUltimaPosicionMotorista(motoristaId, fallbackPosition);

  if (!posicion) {
    throw crearError({
      code: `${code}_SIN_GPS`,
      message: "No se pudo validar tu GPS. Activa la ubicacion e intenta de nuevo."
    });
  }

  const distancia = calcularDistanciaMetros(
    posicion.lat,
    posicion.lng,
    destino.lat,
    destino.lng
  );

  if (!Number.isFinite(distancia)) {
    throw crearError({
      code: `${code}_INVALIDA`,
      message: "No se pudo calcular la distancia del viaje."
    });
  }

  const distanciaMetros = Math.round(distancia);

  if (distanciaMetros > maxDistanceMeters) {
    throw crearError({
      code,
      message,
      distanciaMetros,
      maxDistanceMeters
    });
  }

  return {
    posicion,
    distanciaMetros,
    maxDistanceMeters
  };
}

async function obtenerUltimaPosicionMotorista(motoristaId, fallbackPosition = null) {
  const cached = await leerPosicionRedisJson(motoristaId);
  if (cached) return cached;

  const fromHash = await leerPosicionRedisHash(motoristaId);
  if (fromHash) return fromHash;

  return normalizarPunto(fallbackPosition);
}

async function leerPosicionRedisJson(motoristaId) {
  const raw = await redis.get(`motorista:pos:${motoristaId}`);
  if (!raw) return null;

  try {
    const pos = JSON.parse(raw);
    const point = normalizarPunto(pos);
    if (!point) return null;

    const lastUpdate = Number(pos.lastUpdate || 0);
    if (lastUpdate && Date.now() - lastUpdate > POSITION_MAX_AGE_MS) return null;

    return point;
  } catch {
    return null;
  }
}

async function leerPosicionRedisHash(motoristaId) {
  const data = await redis.hgetall(`motorista:data:${motoristaId}`);
  const point = normalizarPunto(data);
  if (!point) return null;

  const lastUpdate = Number(data?.lastUpdate || 0);
  if (lastUpdate && Date.now() - lastUpdate > POSITION_MAX_AGE_MS) return null;

  return point;
}

function normalizarPunto(input) {
  if (!input) return null;

  const candidates = [
    input,
    input.coords,
    input.ubicacion,
    input.location,
    input.position
  ].filter(Boolean);

  for (const candidate of candidates) {
    const lat = Number(candidate.lat ?? candidate.latitude);
    const lng = Number(candidate.lng ?? candidate.lon ?? candidate.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      const coordLng = Number(candidate.coordinates[0]);
      const coordLat = Number(candidate.coordinates[1]);

      if (Number.isFinite(coordLat) && Number.isFinite(coordLng)) {
        return { lat: coordLat, lng: coordLng };
      }
    }
  }

  return null;
}

function crearError({ code, message, distanciaMetros = null, maxDistanceMeters = null }) {
  const err = new Error(message);
  err.code = code;
  err.distanciaMetros = distanciaMetros;
  err.maxDistanceMeters = maxDistanceMeters;
  return err;
}

module.exports = {
  ARRIVAL_MAX_DISTANCE_METERS,
  FINISH_MAX_DISTANCE_METERS,
  validarCercaniaMotorista,
  normalizarPunto
};
