const ubicacionHandler = require("./ubicacion");
const viajesHandler = require("./motorista.viajes");
const { redis } = require("../../../config/redis");

module.exports = (io, socket) => {
    const motoristaId = socket.user._id.toString();
    console.log("🛵 Motorista conectado:", socket.user.nombre);

    // Registrar entrada en Redis
    redis.hset(`motorista:data:${motoristaId}`, {
        socketId: socket.id,
        disponible: "true"
    });

    socket.join("motoristas");

    // Re-unir a salas si tiene viaje activo
    (async () => {
        const Viaje = require("../../../models/Viaje");
        const vActivo = await Viaje.findOne({ motorista: motoristaId, estado: { $in: ["asignado", "en_curso", "reservado"] } });
        if (vActivo) socket.join(`viaje:${vActivo._id}`);
    })();

    ubicacionHandler(io, socket, motoristaId);
    viajesHandler(io, socket, motoristaId);

    socket.on("disconnect", async () => {
        const data = await redis.hgetall(`motorista:data:${motoristaId}`);
        await redis.zrem("motoristas:ubicacion", motoristaId);
        if (data?.city) {
            await redis.zrem(`motoristas:ubicacion:${data.city}`, motoristaId);
        }
        await redis.hset(`motorista:data:${motoristaId}`, "disponible", "false");
    });
};
