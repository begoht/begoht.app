const { redis } = require("../../../config/redis");

const GPS_TIMEOUT_MS = 120000;
const TIEMPO_OFERTA_MS = 15000;

async function enviarWave({
    lista,
    viajeId,
    viajeActual,
    intentoSet,
    expira
}) {

    const status = await redis.get(`viaje:status:${viajeId}`);
    
    if (status?.startsWith("aceptado") || ["cancelado", "busqueda_anulada"].includes(status)) {
        console.log("⛔ Wave cancelada por estado final");
        return [];
    }
    
    const validos = [];
    if (!lista.length) return validos;

    await redis.sadd(intentoSet, ...lista);

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
        const estadoInterno = mData.estadoInterno;

        let km = parseFloat(mData.kmRestantes);
        if (isNaN(km)) km = 999;

        let permitir = false;

        if (disponible && !enViaje) {
            permitir = true;
        } else if (enViaje) {
            if (!tieneReserva &&
                ["en_curso", "viajando", "llego"].includes(estadoInterno) &&
                km <= 2.5) {
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

            const tempKey = `viaje:oferta:pendiente:${viajeId}:${motoristaId}`;
            
            const payload = {
                viajeId,
                ofertaId: `${viajeId}:${Date.now()}:${motoristaId}`,
                origen: viajeActual.origen,
                destino: viajeActual.destino,
                precio: viajeActual.precio,
                isReserva: enViaje,
                expira
            };
            
            await redis.set(
                tempKey,
                JSON.stringify(payload),
                "PX",
                TIEMPO_OFERTA_MS
            );
            
            await redis.hset(`motorista:data:${motoristaId}`, {
                ofertaPendienteKey: tempKey
            });

            /*************************************************
             * 🔥 REGISTRAR MOTORISTA OFERTADO
            *************************************************/
           await redis.sadd(
               `viaje:ofertandos:${viajeId}`,
               motoristaId
            );
            
            await redis.expire(
                `viaje:ofertandos:${viajeId}`,
                60
            );
            
            global.io
            .to(`motorista:${motoristaId}`)
            .emit("viaje:oferta", {
                ...payload,
                ttl: TIEMPO_OFERTA_MS
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
                        ttl: TIEMPO_OFERTA_MS,
                        timestamp: Date.now()
                    });
                }
            }
            
        }));
    }
        

    return validos;
}

module.exports = { enviarWave };
