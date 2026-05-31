const { redis } = require("../../../../config/redis");

const TTL_MS = 60 * 1000; // 1 minuto

function key(userId) {
  return `cotizacion:${userId}`;
}

module.exports = {

  async guardar(userId, data) {
    await redis.set(
      key(userId),
      JSON.stringify(data),
      "PX",
      TTL_MS
    );
  },

  async obtener(userId) {
    const raw = await redis.get(key(userId));
    return raw ? JSON.parse(raw) : null;
  },

  async eliminar(userId) {
    await redis.del(key(userId));
  }
};