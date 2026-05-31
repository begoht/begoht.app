const { redis } = require("../../../../config/redis");

module.exports = (io, socket) => {
    return async ({ viajeId }) => {
        if (!viajeId || !socket?.user?._id) return;

        const motoristaId = socket.user._id.toString();
        const ofertaKey = `viaje:oferta:pendiente:${viajeId}:${motoristaId}`;

        try {
            await redis.multi()
                .sadd(`viaje:rechazados:${viajeId}`, motoristaId)
                .sadd(`viaje:excluidos:${viajeId}`, motoristaId)
                .expire(`viaje:rechazados:${viajeId}`, 600)
                .expire(`viaje:excluidos:${viajeId}`, 600)
                .del(ofertaKey)
                .hdel(`motorista:data:${motoristaId}`, "ofertaPendienteKey")
                .publish(`viaje:canal:${viajeId}`, JSON.stringify({
                    type: "rechazado",
                    viajeId,
                    motoristaId
                }))
                .exec();

            socket.emit("viaje:oferta-cerrada", { viajeId });
        } catch (err) {
            console.error("Error rechazando viaje:", err);
            socket.emit("error-operacion");
        }
    };
};
