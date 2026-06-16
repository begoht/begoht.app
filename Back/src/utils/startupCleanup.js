const Viaje = require("../models/Viaje");
const { redis } = require("../config/redis");

const limpiarEstadosHuerfanos = async () => {
  try {
    console.log("🧹 Iniciando verificación de salud de viajes...");

    /*************************************************
     * ⏱️ TIEMPOS
     *************************************************/
    const haceDosHoras = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const hace5Min = new Date(Date.now() - 5 * 60 * 1000);

    /*************************************************
     * 🧟 EXPIRAR VIAJES HUERFANOS SIN INICIAR (2H INACTIVOS)
     *************************************************/
    const activosResult = await Viaje.updateMany(
      {
        estado: { $in: ["asignado", "llego", "reservado"] },
        updatedAt: { $lt: haceDosHoras }
      },
      {
        $set: {
          estado: "expirado",
          finalizacionMotivo: "expirado_por_inactividad_tras_reinicio"
        }
      }
    );

    /*************************************************
     * 🧹 LIMPIAR REDIS SOLO PARA VIAJES MUERTOS
     *************************************************/
    const viajesExpirados = await Viaje.find(
      {
        estado: { $in: ["expirado", "finalizado", "cancelado"] },
        updatedAt: { $lt: hace5Min }
      }
    ).select("_id");

    let redisLimpios = 0;

    for (const v of viajesExpirados) {
      await redis.del(`viaje:status:${v._id}`);
      await redis.del(`viaje:ganador:${v._id}`);
      await redis.del(`despacho:${v._id}`);
      redisLimpios++;
    }

    /*************************************************
     * LOGS
     *************************************************/
    console.log(`🧟 Viajes huerfanos expirados: ${activosResult.modifiedCount}`);
    console.log(`🧹 Redis limpiado en ${redisLimpios} viaje(s)`);
    console.log(`🚀 Sistema listo para recovery limpio`);

  } catch (error) {
    console.error("❌ Error durante la limpieza de inicio:", error);
  }
};

module.exports = limpiarEstadosHuerfanos;
