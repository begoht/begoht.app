const { redis } = require("../../../../config/redis");

module.exports = async function onDisconnect(motoristaId) {
  try {
    const isOnline = await redis.exists(`motorista:online:${motoristaId}`);

    if (!isOnline) {
      await redis.hset(`motorista:data:${motoristaId}`, {
        disponible: "false",
        estadoInterno: "offline",
        kmRestantes: "0"
      });
    }

    console.log("🔌 Motorista desconectado:", motoristaId);

  } catch (error) {
    console.error("❌ Error en disconnect motorista:", error);
  }
};