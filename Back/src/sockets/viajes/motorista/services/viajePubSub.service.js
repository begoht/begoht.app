const { redis } = require("../../../../config/redis");

module.exports = async (viajeId, payload) => {
    await redis.publish(
        `viaje:canal:${viajeId}`,
        JSON.stringify(payload)
    );
};