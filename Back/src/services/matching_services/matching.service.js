const Viaje = require("../../models/Viaje");
const { redis } = require("../../config/redis");
const { matchingQueue } = require("../../config/queues");

const serviceLock = require("./service.lock");
const serviceBuscador = require("./service.buscador");
const serviceDespacho = require("./despacho/service.despacho");
const serviceAceptarRechazar = require("./service.aceptarRechazar");

const RADIO_MAX_KM = 12;

/**
 * 🚀 Asignación inicial de viaje
 */
async function asignarViaje(viajeId, radioKm = 2) {
    const lockId = await serviceLock.adquirirLock(viajeId);
    if (!lockId) {
        console.log(`🔒 Viaje ${viajeId} ya está siendo procesado.`);
        return;
    }

    try {
        console.log(`🎯 Iniciando asignación para viaje ${viajeId}`);

        /*************************************************
         * 🔐 VALIDACIÓN GLOBAL (ANTI LOOP)
         *************************************************/
        const statusRedis = await redis.get(`viaje:status:${viajeId}`);
        if (statusRedis?.startsWith("aceptado")) {
            console.log(`⛔ Viaje ${viajeId} ya aceptado (pre-check)`);
            await serviceLock.liberarLock(viajeId, lockId);
            return;
        }

        const viaje = await Viaje.findOneAndUpdate(
            { _id: viajeId, estado: "buscando" },
            { $set: { estado: "ofertando", ofertandoEn: new Date() } },
            { new: true }
        );

        if (!viaje) {
            console.log(`⚠️ Viaje ${viajeId} no válido o ya procesado.`);
            await serviceLock.liberarLock(viajeId, lockId);
            return;
        }

        const candidatosIds = await serviceBuscador.obtenerCandidatos(viaje, radioKm);

        /*************************************************
         * 🚫 SIN CANDIDATOS → CONTROL REAL
         *************************************************/
        if (!candidatosIds || candidatosIds.length === 0) {

            // 🔴 CORTE DEFINITIVO
            if (radioKm >= RADIO_MAX_KM) {
                console.log(`🛑 Sin motoristas tras ${RADIO_MAX_KM}km → FIN`);

                await Viaje.updateOne(
                    { _id: viajeId },
                    { $set: { estado: "sin_motorista" } }
                );

                await redis.set(`viaje:status:${viajeId}`, "sin_motorista", "EX", 300);

                if (viaje.pasajero && global.io) {
                    global.io
                        .to(`pasajero:${viaje.pasajero.toString()}`)
                        .emit("no-motorista", {
                            viajeId: viajeId.toString(),
                            estado: "sin_motorista",
                            mensaje: "Aucun motorista disponible pour le moment. Vous pouvez reessayer dans quelques minutes.",
                            radioKm: RADIO_MAX_KM,
                            timestamp: Date.now()
                        });
                }

                await serviceLock.liberarLock(viajeId, lockId);
                return;
            }

            console.log(`❌ Sin motoristas (${radioKm}km). Reintentando...`);

            await Viaje.updateOne(
                { _id: viajeId, estado: "ofertando" },
                { $set: { estado: "buscando" } }
            );
            await redis.set(`viaje:status:${viajeId}`, "buscando", "EX", 300);

            await serviceLock.liberarLock(viajeId, lockId);

            await matchingQueue.add(
                "buscar-motorista",
                { viajeId, radioKm: radioKm + 1 },
                {
                    delay: 4000,
                    removeOnComplete: true
                }
            );

            return;
        }

        const despachoKey = `despacho:${viajeId}`;

        await redis.hset(despachoKey, "lockId", lockId);
        await redis.expire(despachoKey, 300);

        await redis.set(`viaje:status:${viajeId}`, "ofertando", "EX", 60);

        await matchingQueue.add(
            "despacho",
            { viajeId, candidatosIds, despachoKey },
            {
                jobId: `despacho-${viajeId}`,
                removeOnComplete: true
            }
        );

        console.log(`🚀 Despacho iniciado para viaje ${viajeId}`);

    } catch (err) {
        console.error("❌ Matching Error:", err);
        await serviceLock.liberarLock(viajeId, lockId);
    }
}

module.exports = {
    asignarViaje,
    ejecutarDespachoIterativo: serviceDespacho.ejecutar,
    aceptarViaje: serviceAceptarRechazar.aceptar,
    rechazarViaje: serviceAceptarRechazar.rechazar
};
