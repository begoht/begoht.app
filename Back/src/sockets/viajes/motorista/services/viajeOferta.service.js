const { redis } = require("../../../../config/redis");
const {
    getOfferKey,
    getOfferSetKey,
    getOfferMotoristaIds,
    releaseOfferLocksForViaje
} = require("../../../../services/matching_services/offerLock.service");

module.exports = async (viajeId, exceptMotoristaId = null) => {
    const motoristaIds = await getOfferMotoristaIds(viajeId);

    if (!motoristaIds.length) {
        await redis.del(getOfferSetKey(viajeId));
        return;
    }

    const pipeline = redis.multi();

    for (const motoristaId of motoristaIds) {
        pipeline.del(getOfferKey(viajeId, motoristaId));

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
    await releaseOfferLocksForViaje(viajeId, motoristaIds);

    await redis.del(getOfferSetKey(viajeId));
};
