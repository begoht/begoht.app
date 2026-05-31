const { redis } = require("../../../../config/redis");

module.exports = async (motoristaId) => {
    const data = await redis.hgetall(
        `motorista:data:${motoristaId}`
    );

    if (!data || Object.keys(data).length === 0) {
        return null;
    }

    let lat = parseFloat(data.lat);
    let lng = parseFloat(data.lng);

    if (isNaN(lat) || isNaN(lng)) {
        const raw = await redis.get(
            `motorista:pos:${motoristaId}`
        );

        if (raw) {
            const pos = JSON.parse(raw);
            lat = pos.lat;
            lng = pos.lng;
        }
    }

    return {
        ...data,
        lat,
        lng,
        estadoInterno: data.estadoInterno || "libre",
        viajeActualId: data.viajeActualId || "",
        viajeReservadoId:
            data.viajeReservadoId || "",
        disponible: data.disponible || "true",
        tieneReserva: data.tieneReserva || "false"
    };
};