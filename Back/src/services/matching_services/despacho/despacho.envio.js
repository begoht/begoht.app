const { redis } = require("../../../config/redis");
const {
    evaluarElegibilidadReserva
} = require("../reservaEligibility.service");
const {
    OFFER_TTL_MS,
    acquireOfferLock,
    releaseOfferLock,
    getOfferKey,
    getOfferSetKey
} = require("../offerLock.service");
const { getDriverEarningsForViaje } = require("../../driverEarnings.service");
const { prepararIdaVueltaPayload } = require("../../idaVuelta.service");

const GPS_TIMEOUT_MS = 120000;

async function enviarWave({
    lista,
    viajeId,
    viajeActual,
    intentoSet
}) {

    const status = await redis.get(`viaje:status:${viajeId}`);
    
    if (status?.startsWith("aceptado") || ["cancelado", "busqueda_anulada"].includes(status)) {
        console.log("⛔ Wave cancelada por estado final");
        return [];
    }
    
    const validos = [];
    if (!lista.length) return validos;

    await redis.sadd(intentoSet, ...lista);
    const driverEarnings = await getDriverEarningsForViaje(viajeActual);

    const pipe = redis.multi();
    lista.forEach(id => {
        pipe.hgetall(`motorista:data:${id}`);
        pipe.exists(`lock:cola:${id}`);
        pipe.exists(`motorista:online:${id}`);
    });

    const res = await pipe.exec();

    let idx = 0;

    for (const motoristaId of lista) {
        const mData = res[idx++]?.[1];
        const tieneReserva = res[idx++]?.[1];
        const online = res[idx++]?.[1];

        if (!mData || Object.keys(mData).length === 0) continue;

        let ultimaAct = parseInt(mData.lastUpdate || 0);

        const diff = Date.now() - ultimaAct;
        if (!ultimaAct || isNaN(ultimaAct) || diff > GPS_TIMEOUT_MS) continue;

        
        if (!online) continue;


        const enViaje = mData.viajeActualId && mData.viajeActualId !== "null";
        const disponible = mData.disponible === "true";

        let km = parseFloat(mData.kmRestantes);
        if (isNaN(km)) km = 999;

        let permitir = false;

        if (disponible && !enViaje) {
            permitir = true;
        } else if (enViaje) {
            const reservaElegible = await evaluarElegibilidadReserva({
                motoristaId,
                data: mData,
                tieneReserva: !!tieneReserva
            });

            if (reservaElegible.permitir) {
                km = reservaElegible.kmRestantes ?? km;
                permitir = true;
            }
        }

        if (!permitir) continue;

        validos.push({ motoristaId, enViaje, data: mData });
    }

    const BATCH_SIZE = 20;
    
    for (let i = 0; i < validos.length; i += BATCH_SIZE) {
        
        const batch = validos.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async ({ motoristaId, enViaje, data }) => {
            const status = await redis.get(`viaje:status:${viajeId}`);
            
            if (status?.startsWith("aceptado") || ["cancelado", "busqueda_anulada"].includes(status)) {
                console.log(`⛔ Oferta abortada para ${motoristaId}`);
                return;
            }

            const lockAcquired = await acquireOfferLock({ viajeId, motoristaId });
            if (!lockAcquired) {
                console.log(`Oferta omitida: motorista ${motoristaId} ya tiene oferta activa`);
                return;
            }

            const statusDespuesLock = await redis.get(`viaje:status:${viajeId}`);
            if (
                statusDespuesLock?.startsWith("aceptado") ||
                ["cancelado", "busqueda_anulada"].includes(statusDespuesLock)
            ) {
                await releaseOfferLock({ viajeId, motoristaId });
                return;
            }

            const tempKey = getOfferKey(viajeId, motoristaId);
            const expira = Date.now() + OFFER_TTL_MS;
            
            const payload = {
                viajeId,
                ofertaId: `${viajeId}:${Date.now()}:${motoristaId}`,
                origen: viajeActual.origen,
                destino: viajeActual.destino,
                precio: viajeActual.precio,
                metodoPago: viajeActual.metodoPago,
                estadoPago: viajeActual.estadoPago,
                distanciaKm: viajeActual.distanciaKm,
                duracionMin: viajeActual.duracionMin,
                ...driverEarnings,
                tipo: viajeActual.tipo || "viaje",
                paquete: prepararPaqueteMotorista(viajeActual),
                idaVuelta: prepararIdaVueltaPayload(viajeActual),
                isReserva: enViaje,
                expira
            };
            
            try {
                await redis.set(
                tempKey,
                JSON.stringify(payload),
                "PX",
                OFFER_TTL_MS
            );
            
            await redis.hset(`motorista:data:${motoristaId}`, {
                ofertaPendienteKey: tempKey
            });

            /*************************************************
             * 🔥 REGISTRAR MOTORISTA OFERTADO
            *************************************************/
           await redis.sadd(
               getOfferSetKey(viajeId),
               motoristaId
            );
            
            await redis.expire(
                getOfferSetKey(viajeId),
                60
            );
            
            global.io
            .to(`motorista:${motoristaId}`)
            .emit("viaje:oferta", {
                ...payload,
                ttl: OFFER_TTL_MS
            });

            if (viajeActual.pasajero) {
                const lat = Number(data.lat);
                const lng = Number(data.lng);

                if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                    global.io
                    .to(`pasajero:${viajeActual.pasajero.toString()}`)
                    .emit("busqueda:motorista-candidato", {
                        viajeId,
                        motorista: {
                            id: motoristaId,
                            nombre: data.nombre || data.fullName || "Motorista",
                            lat,
                            lng
                        },
                        ttl: OFFER_TTL_MS,
                        timestamp: Date.now()
                    });
                }
            }
            } catch (err) {
                await redis.del(tempKey);
                await redis.hdel(`motorista:data:${motoristaId}`, "ofertaPendienteKey");
                await releaseOfferLock({ viajeId, motoristaId });

                console.error(
                    `Error enviando oferta ${viajeId} a ${motoristaId}:`,
                    err.message
                );
            }

        }));
    }
        

    return validos;
}

module.exports = { enviarWave };

function prepararPaqueteMotorista(viaje) {
    if ((viaje.tipo || "viaje") !== "envio" || !viaje.paquete) return null;

    return {
        pesoKg: viaje.paquete.pesoKg,
        descripcion: viaje.paquete.descripcion || "",
        instrucciones: viaje.paquete.instrucciones || "",
        codigoEntregaRequerido: true
    };
}
