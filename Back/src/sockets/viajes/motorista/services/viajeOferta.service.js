const { redis } = require("../../../../config/redis");

module.exports = async (viajeId, exceptMotoristaId = null) => {
    const keys = await redis.keys(
        `viaje:oferta:pendiente:${viajeId}:*`
    );

    if (!keys.length) return;

    const pipeline = redis.multi();

    for (const key of keys) {
        const motoristaId = key.split(":").pop();

        pipeline.del(key);

        pipeline.hdel(
            `motorista:data:${motoristaId}`,
            "ofertaPendienteKey"
        );

        if (global.io && motoristaId !== String(exceptMotoristaId || "")) {
            global.io.to(`motorista:${motoristaId}`).emit("viaje:tomado", {
                viajeId,
                status: "tomado_por_otro"
            });
        }
    }

    await pipeline.exec();

    await redis.del(`viaje:ofertandos:${viajeId}`);
};
