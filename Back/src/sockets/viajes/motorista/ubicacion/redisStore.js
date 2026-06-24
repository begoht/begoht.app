const { redis } = require("../../../../config/redis");
const { inferCityFromPoint } = require("../../../../config/cities");
const { getDriverCommissionStatus } = require("../../../../services/driverCommission.service");
const {
  getDriverVerificationStatus,
} = require("../../../../services/driverVerification.service");
const {
  getOfferSetKey,
  releaseOfferLock,
} = require("../../../../services/matching_services/offerLock.service");

const TTL_ONLINE_SECONDS = 60;
const GPS_TIMEOUT_MS = 120000;
const MANUAL_AVAILABILITY_TTL_SECONDS = 60 * 60 * 6;

async function storeRedis(socket, motoristaId, payload) {
  try {
    const lat = parseFloat(payload.lat);
    const lng = parseFloat(payload.lng);
    const heading = payload.heading == null || payload.heading === ""
      ? null
      : Number(payload.heading);
    let disponible =
      payload.disponible !== undefined
        ? payload.disponible !== false && payload.disponible !== "false"
        : true;

    const dataPrev = await redis.hgetall(`motorista:data:${motoristaId}`);

    if (disponible) {
      const manualAvailability = await redis.get(getManualAvailabilityKey(motoristaId));
      if (manualAvailability === "offline") {
        await markUnavailable(socket, motoristaId, { dataPrev });
        return;
      }
    }

    if ((Number.isNaN(lat) || Number.isNaN(lng)) && !disponible) {
      await markUnavailable(socket, motoristaId, { dataPrev });
      return;
    }

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.warn(`[storeRedis] Datos invalidos de ${motoristaId}:`, payload);
      return;
    }

    const now = Date.now();
    const city = inferCityFromPoint({ lat, lng });
    const cityId = city?.id || "unknown";
    const headingValue = heading != null && Number.isFinite(heading) ? heading : null;

    const incomingSocketId = String(socket?.id || "");
    const socketId = incomingSocketId && !incomingSocketId.startsWith("http:")
      ? incomingSocketId
      : dataPrev?.socketId || "";

    if (disponible) {
      const verification = await getDriverVerificationStatus(motoristaId);
      if (!verification.verified) {
        disponible = false;
        socket.emit("driver:verification-required", {
          code: "DRIVER_PENDING_VERIFICATION",
          message: "Tu cuenta motorista esta pendiente de verificacion.",
        });
      }

      const commissionStatus = await disponibilidadPorComision(motoristaId);
      if (commissionStatus?.bloqueadoPorComision) {
        disponible = false;
        socket.emit("driver:commission-blocked", commissionStatus);
      }
    }

    if (dataPrev?.lastUpdate) {
      const diff = now - parseInt(dataPrev.lastUpdate, 10);

      if (diff > GPS_TIMEOUT_MS * 2) {
        console.log(`Limpiando GEO viejo de ${motoristaId}`);
        await redis.zrem("motoristas:ubicacion", motoristaId);
        if (dataPrev.city) {
          await redis.zrem(`motoristas:ubicacion:${dataPrev.city}`, motoristaId);
        }
      }
    }

    const pipeline = redis.pipeline();

    if (disponible) {
      pipeline.geoadd("motoristas:ubicacion", lng, lat, motoristaId);

      if (dataPrev?.city && dataPrev.city !== cityId) {
        pipeline.zrem(`motoristas:ubicacion:${dataPrev.city}`, motoristaId);
      }

      if (city) {
        pipeline.geoadd(`motoristas:ubicacion:${cityId}`, lng, lat, motoristaId);
      }
    } else {
      pipeline.zrem("motoristas:ubicacion", motoristaId);
      pipeline.zrem(`motoristas:ubicacion:${cityId}`, motoristaId);
      if (dataPrev?.city && dataPrev.city !== cityId) {
        pipeline.zrem(`motoristas:ubicacion:${dataPrev.city}`, motoristaId);
      }
    }

    const locationState = {
      disponible: disponible ? "true" : "false",
      online: disponible ? "true" : "false",
      lat: lat.toString(),
      lng: lng.toString(),
      heading: headingValue == null ? "" : headingValue.toString(),
      city: cityId,
      lastUpdate: now.toString()
    };

    if (socketId) {
      locationState.socketId = socketId;
    }

    pipeline.hset(`motorista:data:${motoristaId}`, locationState);

    pipeline.set(
      `motorista:pos:${motoristaId}`,
      JSON.stringify({
        lat,
        lng,
        heading: headingValue,
        city: cityId,
        lastUpdate: now
      }),
      "EX",
      60 * 60 * 6
    );

    if (disponible) {
      pipeline.set(
        `motorista:online:${motoristaId}`,
        "1",
        "EX",
        TTL_ONLINE_SECONDS
      );
    } else {
      pipeline.del(`motorista:online:${motoristaId}`);
    }

    await pipeline.exec();

    if (!disponible) {
      await clearPendingOffer(motoristaId, dataPrev?.ofertaPendienteKey);
    }
  } catch (error) {
    console.error(`[storeRedis] Error critico para ${motoristaId}:`, error);
  }
}

async function markUnavailable(socket, motoristaId, { dataPrev = null } = {}) {
  const now = Date.now();
  const data = dataPrev || await redis.hgetall(`motorista:data:${motoristaId}`);
  const pipeline = redis.pipeline();

  pipeline.hset(`motorista:data:${motoristaId}`, {
    disponible: "false",
    online: "false",
    lastUpdate: now.toString()
  });

  const incomingSocketId = String(socket?.id || "");
  if (incomingSocketId && !incomingSocketId.startsWith("http:")) {
    pipeline.hset(`motorista:data:${motoristaId}`, "socketId", incomingSocketId);
  }

  pipeline.del(`motorista:online:${motoristaId}`);
  pipeline.set(
    getManualAvailabilityKey(motoristaId),
    "offline",
    "EX",
    MANUAL_AVAILABILITY_TTL_SECONDS
  );
  pipeline.zrem("motoristas:ubicacion", motoristaId);

  if (data?.city) {
    pipeline.zrem(`motoristas:ubicacion:${data.city}`, motoristaId);
  }

  await pipeline.exec();
  await clearPendingOffer(motoristaId, data?.ofertaPendienteKey);
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

function getManualAvailabilityKey(motoristaId) {
  return `motorista:availability:manual:${motoristaId}`;
}

async function disponibilidadPorComision(motoristaId) {
  const cacheKey = `motorista:commission-status:${motoristaId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  const status = await getDriverCommissionStatus(motoristaId, { lean: true });
  await redis.set(cacheKey, JSON.stringify(status), "EX", 30);
  return status;
}

module.exports = storeRedis;
module.exports.markUnavailable = markUnavailable;
module.exports.getManualAvailabilityKey = getManualAvailabilityKey;
