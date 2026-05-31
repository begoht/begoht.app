const { redis } = require("../../../../config/redis");
const { inferCityFromPoint } = require("../../../../config/cities");

const TTL_ONLINE_SECONDS = 60;
const GPS_TIMEOUT_MS = 120000; // 2 min

module.exports = async (socket, motoristaId, payload) => {
  try {
    // ==========================================
    // 1. PARSEO SEGURO
    // ==========================================
    const lat = parseFloat(payload.lat);
    const lng = parseFloat(payload.lng);
    const disponible =
      payload.disponible !== undefined ? payload.disponible : true;

    if (isNaN(lat) || isNaN(lng)) {
      console.warn(`⚠️ [storeRedis] Datos inválidos de ${motoristaId}:`, payload);
      return;
    }

    const now = Date.now();
    const city = inferCityFromPoint({ lat, lng });
    const cityId = city?.id || "unknown";

    // ==========================================
    // 2. LIMPIEZA PREVENTIVA (ANTI FANTASMAS)
    // ==========================================
    const dataPrev = await redis.hgetall(`motorista:data:${motoristaId}`);

    if (dataPrev?.lastUpdate) {
      const diff = now - parseInt(dataPrev.lastUpdate);

      if (diff > GPS_TIMEOUT_MS * 2) {
        console.log(`🧹 Limpiando GEO viejo de ${motoristaId}`);
        await redis.zrem("motoristas:ubicacion", motoristaId);
        if (dataPrev.city) {
          await redis.zrem(`motoristas:ubicacion:${dataPrev.city}`, motoristaId);
        }
      }
    }

    // ==========================================
    // 3. PIPELINE
    // ==========================================
    const pipeline = redis.pipeline();

    // GEO (clave para matching)
    pipeline.geoadd("motoristas:ubicacion", lng, lat, motoristaId);

    if (city) {
      pipeline.geoadd(`motoristas:ubicacion:${cityId}`, lng, lat, motoristaId);
    }

    // DATA COMPLETA (CRÍTICO)
    pipeline.hset(`motorista:data:${motoristaId}`, {
      socketId: socket.id,
      disponible: disponible ? "true" : "false",
      lat: lat.toString(),
      lng: lng.toString(),
      city: cityId,
      lastUpdate: now.toString(), // 🔥 CLAVE PARA MATCHING
    });

    pipeline.set(
      `motorista:pos:${motoristaId}`,
      JSON.stringify({ lat, lng, city: cityId, lastUpdate: now }),
      "EX",
      60 * 60 * 6
    );

    // ONLINE FLAG
    pipeline.set(
      `motorista:online:${motoristaId}`,
      "1",
      "EX",
      TTL_ONLINE_SECONDS
    );

    await pipeline.exec();

  } catch (error) {
    console.error(`❌ [storeRedis] Error crítico para ${motoristaId}:`, error);
  }
};
