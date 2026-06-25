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

  const posiciones = await obtenerPosicionesMotorista(motoristaId, fallbackPosition);

  if (!posiciones.length) {
    throw crearError({
      code: `${code}_SIN_GPS`,
      message: "No se pudo validar tu GPS. Activa la ubicacion e intenta de nuevo."
    });
  }

  const evaluaciones = posiciones
    .map((posicion) => ({
      posicion,
      distanciaMetros: Math.round(calcularDistanciaMetros(
        posicion.lat,
        posicion.lng,
        destino.lat,
        destino.lng
      ))
    }))
    .filter((item) => Number.isFinite(item.distanciaMetros));

  if (!evaluaciones.length) {
    throw crearError({
      code: `${code}_INVALIDA`,
      message: "No se pudo calcular la distancia del viaje."
    });
  }

  const enRango = evaluaciones
    .filter((item) => item.distanciaMetros <= maxDistanceMeters)
    .sort((a, b) => a.distanciaMetros - b.distanciaMetros)[0];
  const mejor = enRango || evaluaciones.sort((a, b) => a.distanciaMetros - b.distanciaMetros)[0];
  const { posicion, distanciaMetros } = mejor;

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

async function obtenerPosicionesMotorista(motoristaId, fallbackPosition = null) {
  const posiciones = [];

  agregarPosicionUnica(posiciones, await leerPosicionRedisJson(motoristaId));
  agregarPosicionUnica(posiciones, await leerPosicionRedisHash(motoristaId));
  agregarPosicionUnica(posiciones, normalizarPunto(fallbackPosition));

  return posiciones;
}

function agregarPosicionUnica(posiciones, posicion) {
  if (!posicion) return;

  const duplicada = posiciones.some((actual) =>
    Math.abs(actual.lat - posicion.lat) < 0.000001 &&
    Math.abs(actual.lng - posicion.lng) < 0.000001
  );

  if (!duplicada) {
    posiciones.push(posicion);
  }
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
