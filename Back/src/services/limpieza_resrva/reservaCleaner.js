// workers/reservaCleaner.js

const Viaje = require("../../models/Viaje");
const { redis } = require("../../config/redis");

setInterval(async () => {

  const expiracionReserva = new Date(Date.now() - 5 * 60 * 1000);
  const expiracionZombie = new Date(Date.now() - 10 * 60 * 1000);

  /*************************************************
   * 1️⃣ LIMPIAR RESERVAS ZOMBIE
   *************************************************/
  const reservasZombies = await Viaje.find({
    estado: "reservado",
    reservadoEn: { $lt: expiracionReserva }
  });

  for (const viaje of reservasZombies) {

    const mData = await redis.hgetall(`motorista:data:${viaje.motorista}`);

    if (!mData?.socketId || mData?.disponible === "false") {

      await Viaje.updateOne(
        { _id: viaje._id },
        {
          $set: {
            estado: "buscando",
            motorista: null,
            reservadoEn: null,
            enMatching: false   // ⭐ CRÍTICO
          }
        }
      );

      console.log(`🧹 Reserva liberada: ${viaje._id}`);
    }
  }

  /*************************************************
   * 2️⃣ WATCHDOG VIAJES ofertandoS
   *************************************************/
  const viajesofertandos = await Viaje.find({
    estado: "ofertando",
    ofertandoEn: { $lt: expiracionZombie }
  });

  for (const v of viajesofertandos) {

    const activo = await redis.exists(`despacho:${v._id}`);

    if (!activo) {
      await Viaje.updateOne(
        { _id: v._id },
        {
          $set: {
            estado: "buscando",
            enMatching: false   // ⭐ CRÍTICO
          }
        }
      );

      console.log(`🛡️ Watchdog: Viaje reiniciado: ${v._id}`);
    }
  }

}, 30000);