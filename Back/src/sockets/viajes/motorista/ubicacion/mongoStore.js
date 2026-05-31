const Motorista = require("../../../../models/motorista");
const { redis } = require("../../../../config/redis");

const UPDATE_INTERVAL_SEC = 30;

module.exports = async (motoristaId, { lat, lng }) => {
  if (typeof lat !== "number" || typeof lng !== "number") return;

  const lockKey = `lock:mongo-motorista:${motoristaId}`;
  
  // Si logra setear el valor, significa que pasaron los 30 segundos
  const lockAdquirido = await redis.set(lockKey, "1", "NX", "EX", UPDATE_INTERVAL_SEC);
  
  if (lockAdquirido) {
    await Motorista.updateOne({ _id: motoristaId }, {
      $set: { ubicacion: { lat, lng } }
    });
  }
};
