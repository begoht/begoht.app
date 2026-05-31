const Viaje = require("../../../models/Viaje");
const { redis } = require("../../../config/redis");

module.exports = function initMotoristaCola(io, socket, motoristaId) {
    // 1️⃣ HANDLER ELIMINADO: No se activan viajes desde el cliente.

    socket.on("aceptar-viaje-siguiente", async ({ viajeId }) => {
        try {
            // 4️⃣ REDIS CHECK
            const ocupadoEnRedis = await redis.sismember("motoristas:ocupados", motoristaId);
            if (ocupadoEnRedis) {
                // Si ya está en "ocupados", solo puede aceptar si es para "reservado"
                // pero este socket es para cuando el motorista está libre.
                // Ajustar según lógica de negocio.
            }

            const viaje = await Viaje.findOneAndUpdate(
                { _id: viajeId, estado: "buscando", motorista: null },
                { $set: { motorista: motoristaId, motoristaSocket: socket.id, estado: "reservado" } },
                { new: true }
            );

            if (!viaje) return socket.emit("viaje-siguiente-no-disponible");

            socket.emit("viaje-siguiente-confirmado", {
                viajeId: viaje._id.toString(),
                origen: viaje.origen
            });
        } catch (err) {
            console.error("❌ aceptar-viaje-siguiente", err);
        }
    });
};