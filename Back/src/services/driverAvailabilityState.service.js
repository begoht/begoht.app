const { redis } = require("../config/redis");
const { inferCityFromPoint } = require("../config/cities");
const {
  getOfferSetKey,
  releaseOfferLock,
} = require("./matching_services/offerLock.service");

const DRIVER_ONLINE_TTL_SECONDS = Math.max(
  60,
  Number(process.env.DRIVER_ONLINE_TTL_SECONDS || 180)
);
const DRIVER_GPS_TIMEOUT_MS = Math.max(
  60000,
  Number(process.env.DRIVER_GPS_TIMEOUT_MS || 180000)
);
const MANUAL_AVAILABILITY_TTL_SECONDS = 60 * 60 * 6;

function getManualAvailabilityKey(motoristaId) {
  return `motorista:availability:manual:${motoristaId}`;
}

function hasActiveDriverSocket(motoristaId) {
  const room = global.io?.sockets?.adapter?.rooms?.get(`motorista:${motoristaId}`);
  return Boolean(room?.size);
}

function isFreshDriverData(data = {}, now = Date.now()) {
  const lastUpdate = Number(data.lastUpdate || 0);
  return Boolean(lastUpdate && now - lastUpdate <= DRIVER_GPS_TIMEOUT_MS);
}

function hasValidCoordinates(data = {}) {
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

async function setDriverUnavailable(motoristaId, { source = "system" } = {}) {
  const data = await redis.hgetall(`motorista:data:${motoristaId}`);
  const pipeline = redis.multi()
    .hset(`motorista:data:${motoristaId}`, {
      disponible: "false",
      online: "false",
      estadoInterno: "offline",
      lastAvailabilitySource: source,
      lastAvailabilityAt: Date.now().toString(),
    })
    .del(`motorista:online:${motoristaId}`)
    .set(
      getManualAvailabilityKey(motoristaId),
      "offline",
      "EX",
      MANUAL_AVAILABILITY_TTL_SECONDS
    )
    .zrem("motoristas:ubicacion", motoristaId);

  if (data?.city) {
    pipeline.zrem(`motoristas:ubicacion:${data.city}`, motoristaId);
  }

  await pipeline.exec();
  await clearPendingOffer(motoristaId, data?.ofertaPendienteKey);

  global.io?.to(`motorista:${motoristaId}`).emit("driver:availability-sync", {
    disponible: false,
    source,
    timestamp: Date.now(),
  });
  global.io?.to(`motorista:${motoristaId}`).emit("viaje:oferta-cerrada", {
    reason: "driver_unavailable",
    source,
  });
}

async function clearPendingOffer(motoristaId, ofertaPendienteKey) {
  if (!ofertaPendienteKey) return;

  const parts = String(ofertaPendienteKey).split(":");
  const viajeId = parts[3];
  if (!viajeId) return;

  await redis.multi()
    .del(ofertaPendienteKey)
    .hdel(`motorista:data:${motoristaId}`, "ofertaPendienteKey")
    .srem(getOfferSetKey(viajeId), motoristaId)
    .exec();

  await releaseOfferLock({ viajeId, motoristaId });
}

async function setDriverAvailableRequested(motoristaId, { source = "system" } = {}) {
  const now = Date.now();
  const data = await redis.hgetall(`motorista:data:${motoristaId}`);
  const connected = hasActiveDriverSocket(motoristaId);
  const fresh = isFreshDriverData(data, now) && hasValidCoordinates(data);
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  const city = fresh ? inferCityFromPoint({ lat, lng }) : null;
  const cityId = city?.id || data.city || "unknown";

  const pipeline = redis.multi()
    .del(getManualAvailabilityKey(motoristaId))
    .hset(`motorista:data:${motoristaId}`, {
      disponible: "true",
      lastAvailabilitySource: source,
      lastAvailabilityAt: now.toString(),
    });

  if (connected && fresh) {
    pipeline.hset(`motorista:data:${motoristaId}`, {
      online: "true",
      city: cityId,
    });
    pipeline.set(
      `motorista:online:${motoristaId}`,
      "1",
      "EX",
      DRIVER_ONLINE_TTL_SECONDS
    );
    pipeline.geoadd("motoristas:ubicacion", lng, lat, motoristaId);
    if (city) {
      pipeline.geoadd(`motoristas:ubicacion:${cityId}`, lng, lat, motoristaId);
    }
    if (data.city && data.city !== cityId) {
      pipeline.zrem(`motoristas:ubicacion:${data.city}`, motoristaId);
    }
  }

  await pipeline.exec();

  global.io?.to(`motorista:${motoristaId}`).emit("driver:availability-sync", {
    disponible: true,
    source,
    timestamp: now,
  });
  global.io?.to(`motorista:${motoristaId}`).emit("driver:location-refresh-required", {
    reason: source,
    timestamp: now,
  });
}

async function applyDriverAvailabilityState(motoristaId, disponible, options = {}) {
  if (disponible) {
    return setDriverAvailableRequested(motoristaId, options);
  }

  return setDriverUnavailable(motoristaId, options);
}

module.exports = {
  DRIVER_GPS_TIMEOUT_MS,
  DRIVER_ONLINE_TTL_SECONDS,
  applyDriverAvailabilityState,
  getManualAvailabilityKey,
  hasActiveDriverSocket,
  isFreshDriverData,
};
