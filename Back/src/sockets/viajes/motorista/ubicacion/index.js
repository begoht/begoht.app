const storeRedis = require("./redisStore");
const storeMongo = require("./mongoStore");
const tracking = require("./tracking");
const broadcast = require("./broadcast");
const reservado = require("./reservado");
const onDisconnect = require("./disconnect");

module.exports = (io, socket, motoristaId) => {
  socket.on("motoristas:ubicacion", async (payload) => {
    try {
      // 1. Operación crítica y obligatoria
      await storeRedis(socket, motoristaId, payload);

      // 2. Operaciones secundarias (Paralelizadas para mejor performance)
      Promise.all([
        storeMongo(motoristaId, payload),
        tracking(io, motoristaId, payload),
        broadcast(io, motoristaId, payload),
        reservado(io, motoristaId, payload)
      ]).catch(e => console.error("Error en procesos paralelos:", e));

    } catch (error) {
      console.error("❌ Error crítico en motoristas:ubicacion:", error);
    }
  });
};