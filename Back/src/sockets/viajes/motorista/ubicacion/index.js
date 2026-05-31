const storeRedis = require("./redisStore");
const storeMongo = require("./mongoStore");
const tracking = require("./tracking");
const broadcast = require("./broadcast");
const reservado = require("./reservado");
const onDisconnect = require("./disconnect");
const { redis } = require("../../../../config/redis");

const LOCATION_MIN_INTERVAL_MS = Math.max(
  0,
  Number(process.env.LOCATION_MIN_INTERVAL_MS || 3000)
);
const LOCATION_MONGO_SNAPSHOT_ENABLED =
  process.env.LOCATION_MONGO_SNAPSHOT_ENABLED === "true";

module.exports = (io, socket, motoristaId) => {
  socket.on("motoristas:ubicacion", async (payload) => {
    try {
      const accepted = await shouldAcceptLocation(motoristaId, payload);
      if (!accepted) return;

      // 1. Operación crítica y obligatoria
      await storeRedis(socket, motoristaId, payload);

      // 2. Operaciones secundarias (Paralelizadas para mejor performance)
      const tasks = [
        tracking(io, motoristaId, payload),
        broadcast(io, motoristaId, payload),
        reservado(io, motoristaId, payload)
      ];

      if (LOCATION_MONGO_SNAPSHOT_ENABLED) {
        tasks.push(storeMongo(motoristaId, payload));
      }

      Promise.all(tasks).catch(e => console.error("Error en procesos paralelos:", e));

    } catch (error) {
      console.error("❌ Error crítico en motoristas:ubicacion:", error);
    }
  });
};

async function shouldAcceptLocation(motoristaId, payload = {}) {
  if (LOCATION_MIN_INTERVAL_MS <= 0) return true;
  if (payload.force || payload.disponible === false) return true;

  const key = `motorista:ubicacion:rate:${motoristaId}`;
  const ok = await redis.set(key, "1", "PX", LOCATION_MIN_INTERVAL_MS, "NX");
  return ok === "OK";
}
