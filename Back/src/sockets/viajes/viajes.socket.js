const { motoristas } = require("./state");
const pasajeroHandlers = require("./pasajeros/pasajero.handlers");
const motoristaHandlers = require("./motorista/motorista.handlers");
const chatHandlers = require("./chat.socket");
const Viaje = require("../../models/Viaje");
const { redis } = require("../../config/redis");
const {
  getManualAvailabilityKey,
} = require("../../services/driverAvailabilityState.service");

// 🔥 Estados coherentes con Redis
const ESTADOS_MATCHING = ["buscando", "ofertando"];
const ESTADOS_FINALES = ["finalizado", "cancelado", "expirado"];

module.exports = (io, socket) => {
  const role = socket.data?.role || socket.handshake.auth?.role;
  const userId = socket.user?._id?.toString() || socket.user?.id;

  console.log("🔄 Socket router iniciado. Role =", role);

  /*************************************************
   * 👤 CONFIGURACIÓN POR ROL
   *************************************************/
  if (role === "pasajero") {
    socket.join("pasajeros");
    // Unir a sala personal para recibir eventos directos
    socket.join(`pasajero:${userId}`);
    
    pasajeroHandlers(io, socket);

    console.log(`🟢 Pasajero conectado: ${socket.user?.nombre || socket.id}`);
  } 
  else if (role === "motorista") {
    socket.join("motoristas");
    // Unir a sala personal
    socket.join(`motorista:${userId}`);

    const loc = socket.user?.ubicacionActual;
    const tienePosicion = loc && loc.lat !== null && loc.lng !== null;

    motoristas.set(socket.id, {
      id: socket.id,
      userId: userId || null,
      nombre: socket.user?.nombre || "Desconocido",
      lat: tienePosicion ? loc.lat : null,
      lng: tienePosicion ? loc.lng : null,
      disponible: false,
      conectadoEn: new Date(),
    });

    motoristaHandlers(io, socket, userId);

    socket.emit("motorista:verificar-estado-trigger");
    console.log(`🟢 Motorista conectado: ${socket.user?.nombre || socket.id}`);
  }

  /*************************************************
   * 📡 TRACKING
   *************************************************/
  chatHandlers(io, socket);

  socket.on("identificar-motorista", async ({ motoristaId }) => {
    try {
      await redis.hset(`motorista:data:${motoristaId}`, "socketId", socket.id);
    } catch {}
  });

  /*************************************************
   * 🔌 DISCONNECT
   *************************************************/
  socket.on("disconnect", async () => {
    if (role === "motorista") {
      if (motoristas.has(socket.id)) {
        const motorista = motoristas.get(socket.id);
        const mId = motorista.userId || motorista.id;

        try {
          const data = await redis.hgetall(`motorista:data:${mId}`);
          const [manualOffline, onlineKey] = await Promise.all([
            redis.get(getManualAvailabilityKey(mId)),
            redis.exists(`motorista:online:${mId}`),
          ]);

          if (manualOffline === "offline" || !onlineKey) {
            await redis.multi()
              .hset(`motorista:data:${mId}`, {
                disponible: "false",
                online: "false"
              })
              .zrem("motoristas:ubicacion", mId)
              .zrem(data?.city ? `motoristas:ubicacion:${data.city}` : "motoristas:ubicacion:unknown", mId)
              .del(`motorista:online:${mId}`)
              .exec();
          } else {
            await redis.hset(`motorista:data:${mId}`, {
              estadoInterno: "background",
              lastSocketDisconnect: Date.now().toString(),
            });
          }
        } catch {}

        motoristas.delete(socket.id);
      }
      console.log(`🔌 Motorista desconectado: ${socket.id}`);
    }
    else if (role === "pasajero") {
      try {
        const viajes = await Viaje.find({
          pasajero: userId,
          estado: { $nin: ESTADOS_FINALES }
        }).select("_id").lean();

        for (const v of viajes) {
          const redisStatus = await redis.get(`viaje:status:${v._id}`);
          if (ESTADOS_MATCHING.includes(redisStatus)) {
            await Viaje.updateOne(
              { _id: v._id },
              {
                $set: {
                  estado: "cancelado",
                  motivoCancelacion: "desconexion_app",
                  canceladoEn: new Date()
                }
              }
            );

            await redis.multi()
              .set(`viaje:status:${v._id}`, "cancelado", "EX", 60)
              .del(`viaje:ganador:${v._id}`)
              .publish(`viaje:canal:${v._id}`, JSON.stringify({ type: "cancelado" }))
              .exec();

            // 🔥 Limpiar Snapshot al cancelar por desconexión
            await redis.del(`pasajero:snapshot:${userId}`);
            console.log(`🧹 Viaje ${v._id} cancelado y snapshot limpio`);
          }
        }
      } catch (err) {
        console.error("❌ limpieza pasajero:", err);
      }
    }
  });
};
