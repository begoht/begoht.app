const { redis } = require("../../../../config/redis");
const { inferCityFromPoint } = require("../../../../config/cities");
const { getDriverCommissionStatus } = require("../../../../services/driverCommission.service");
const {
  getDriverVerificationStatus,
} = require("../../../../services/driverVerification.service");

const TTL_ONLINE_SECONDS = 60;
const GPS_TIMEOUT_MS = 120000;

module.exports = async (socket, motoristaId, payload) => {
  try {
    const lat = parseFloat(payload.lat);
    const lng = parseFloat(payload.lng);
    const heading = payload.heading == null || payload.heading === ""
      ? null
      : Number(payload.heading);
    let disponible =
      payload.disponible !== undefined ? payload.disponible : true;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.warn(`[storeRedis] Datos invalidos de ${motoristaId}:`, payload);
      return;
    }

    const now = Date.now();
    const city = inferCityFromPoint({ lat, lng });
    const cityId = city?.id || "unknown";
    const headingValue = heading != null && Number.isFinite(heading) ? heading : null;

    const dataPrev = await redis.hgetall(`motorista:data:${motoristaId}`);

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

      if (city) {
        pipeline.geoadd(`motoristas:ubicacion:${cityId}`, lng, lat, motoristaId);
      }
    } else {
      pipeline.zrem("motoristas:ubicacion", motoristaId);
      pipeline.zrem(`motoristas:ubicacion:${cityId}`, motoristaId);
    }

    pipeline.hset(`motorista:data:${motoristaId}`, {
      socketId: socket.id,
      disponible: disponible ? "true" : "false",
      lat: lat.toString(),
      lng: lng.toString(),
      heading: headingValue == null ? "" : headingValue.toString(),
      city: cityId,
      lastUpdate: now.toString()
    });

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

    pipeline.set(
      `motorista:online:${motoristaId}`,
      "1",
      "EX",
      TTL_ONLINE_SECONDS
    );

    await pipeline.exec();
  } catch (error) {
    console.error(`[storeRedis] Error critico para ${motoristaId}:`, error);
  }
};

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
