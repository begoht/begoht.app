const { redis } = require("../../../config/redis");

async function actualizarSnapshotMotorista(motoristaId, data = {}) {
    const key = `motorista:snapshot:${motoristaId}`;

    // 🛡️ Limpieza de datos: Convertimos todo a String y evitamos undefined/null
    const cleanData = {};
    for (const [prop, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
            cleanData[prop] = String(value); 
        }
    }

    // Agregamos el timestamp siempre como String
    cleanData.actualizado = String(Date.now());

    // Verificamos que haya algo que guardar para no enviar un hset vacío
    if (Object.keys(cleanData).length > 0) {
        await redis.hset(key, cleanData);
        await redis.expire(key, 60 * 60 * 6); // 6 horas
    }
}

async function obtenerSnapshotMotorista(motoristaId) {
    const key = `motorista:snapshot:${motoristaId}`;
    const snap = await redis.hgetall(key);
    return Object.keys(snap).length ? snap : null;
}

module.exports = {
    actualizarSnapshotMotorista,
    obtenerSnapshotMotorista
};