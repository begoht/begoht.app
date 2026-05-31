const { redis } = require("../../../../config/redis");

module.exports = async (viajeId, ctx) => {
    await redis.set(
        `viaje:ctx:${viajeId}`,
        JSON.stringify(ctx),
        "EX",
        600
    );
};