const Viaje = require("../../../../models/Viaje");
const { redis } = require("../../../../config/redis");

function parseJson(value) {
    if (!value) return null;

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function normalizarId(value) {
    if (!value || value === "null") return null;
    return String(value);
}

async function obtenerViajeActualId(motoristaId, viajeActualId) {
    const directo = normalizarId(viajeActualId);
    if (directo) return directo;

    const desdeRedis = await redis.hget(
        `motorista:data:${motoristaId}`,
        "viajeActualId"
    );

    return normalizarId(desdeRedis);
}

async function obtenerProximoDestinoReserva(motoristaId, viajeActualId = null) {
    const actualId = await obtenerViajeActualId(motoristaId, viajeActualId);
    if (!actualId) return null;

    const ctx = parseJson(await redis.get(`viaje:ctx:${actualId}`));
    if (ctx?.destino?.lat != null && ctx?.destino?.lng != null) {
        return ctx.destino;
    }

    if (ctx?.proximoDestino?.lat != null && ctx?.proximoDestino?.lng != null) {
        return ctx.proximoDestino;
    }

    const viajeActual = await Viaje.findOne({
        _id: actualId,
        estado: { $in: ["asignado", "llego", "en_curso"] }
    })
        .select("destino")
        .lean();

    return viajeActual?.destino || null;
}

async function obtenerReservaPorMotorista(motoristaId) {
    return Viaje.findOne({
        motorista: motoristaId,
        estado: "reservado"
    })
        .sort({ createdAt: 1 })
        .select("_id pasajero origen destino")
        .lean();
}

module.exports = {
    obtenerProximoDestinoReserva,
    obtenerReservaPorMotorista
};
