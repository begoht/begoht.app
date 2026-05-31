const Viaje = require("../models/Viaje");
const { redis } = require("../config/redis");

const TTL_ESTADOS = {
  buscando: 300,      // 5 min
  ofertando: 120,     // 2 min
  aceptado: 600,      // 10 min
  asignado: 1800,     // 30 min
  en_curso: 3600,     // 1h
};

async function updateEstado(viajeId, nuevoEstado, extra = {}) {
  const statusKey = `viaje:status:${viajeId}`;
  const canal = `viaje:canal:${viajeId}`;

  const ttl = TTL_ESTADOS[nuevoEstado] || 300;

  /*************************************************
   * 🔥 REDIS = FUENTE DE VERDAD
   *************************************************/
  await redis.set(statusKey, nuevoEstado, "EX", ttl);

  /*************************************************
   * 💾 MONGO = PERSISTENCIA
   *************************************************/
  const updateMongo = {
    estado: nuevoEstado,
    ...extra,
  };

  const viaje = await Viaje.findByIdAndUpdate(
    viajeId,
    { $set: updateMongo },
    { new: true }
  );

  if (!viaje) {
    console.warn(`⚠️ Viaje ${viajeId} no encontrado en Mongo`);
    return null;
  }

  /*************************************************
   * 📡 EVENTO GLOBAL
   *************************************************/
  await redis.publish(canal, JSON.stringify({
    type: "estado",
    estado: nuevoEstado,
    viajeId
  }));

  return viaje;
}

module.exports = {
  updateEstado,
};