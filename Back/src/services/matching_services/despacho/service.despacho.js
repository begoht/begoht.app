const Viaje = require("../../../models/Viaje");
const { redis } = require("../../../config/redis");
const { matchingQueue } = require("../../../config/queues");
const serviceLock = require("../service.lock");

const { esperarRespuestaRedis } = require("./despacho.espera");
const { ordenarCandidatosPorDistancia } = require("./despacho.candidatos");
const { generarWaves } = require("./despacho.waves");
const { enviarWave } = require("./despacho.envio");
const { getOfferKey, releaseOfferLock } = require("../offerLock.service");

const TIEMPO_OFERTA_MS = 30000;

// ⏱️ delays progresivos por wave
const DELAYS_WAVES = [4000, 8000, 12000];

async function ejecutar(viajeId, candidatos, despachoKey) {
    if (!Array.isArray(candidatos) || !candidatos.length) return;

    const intentoSet = `despacho:intentos:${viajeId}`;

    try {
        const viajeActual = await Viaje.findById(viajeId)
            .select("estado origen destino precio precioBase descuentoWallet descuentoWalletRate metodoPago estadoPago distanciaKm duracionMin pasajero tipo paquete idaVuelta")
            .lean();

        if (!viajeActual || viajeActual.estado !== "ofertando") return;

        await redis.expire(intentoSet, 300);

        const ordenados = await ordenarCandidatosPorDistancia(candidatos);
        const waves = generarWaves(ordenados);

        const expira = Date.now() + TIEMPO_OFERTA_MS;

        let enviados = [];
        let resultado = null;

        for (let i = 0; i < waves.length; i++) {

            // 🔒 safety check
            const statusAntes = await redis.get(`viaje:status:${viajeId}`);
            if (["cancelado", "busqueda_anulada"].includes(statusAntes)) {
                resultado = "cancelado";
                break;
            }

            if (statusAntes?.startsWith("aceptado")) {
                resultado = "aceptado";
                break;
            }

            // 🚀 enviar wave
            const nuevos = await enviarWave({
                lista: waves[i],
                viajeId,
                viajeActual,
                intentoSet,
                expira
            });
            
            const ganadorNow = await redis.get(`viaje:ganador:${viajeId}`);
            
            if (ganadorNow) {
                resultado = "aceptado";
                break;
            }

            enviados = enviados.concat(nuevos);

            if (!nuevos.length) continue;

            // ⏱️ calcular tiempo restante global
            const restante = expira - Date.now();
            if (restante <= 0) break;

            // ⏱️ timeout dinámico (clave del fix)
            const esUltimaWave = i === waves.length - 1;
            const timeout = Math.min(
                restante,
                esUltimaWave ? TIEMPO_OFERTA_MS : (DELAYS_WAVES[i] || 10000)
            );

            const resultadoEspera = await esperarRespuestaRedis(viajeId, timeout);
            
            // 🔥 CHECK INMEDIATO (ANTES de usar resultado)
            const ganadorPost = await redis.get(`viaje:ganador:${viajeId}`);
            
            if (ganadorPost) {
                console.log("🟢 Ganador detectado post-espera (override timeout)");
                resultado = "aceptado";
                break;
            }
            resultado = resultadoEspera;

        }

        // 🔥 chequeo final SOLO si no hubo aceptación
        if (resultado !== "aceptado") {
            const estado = await redis.get(`viaje:status:${viajeId}`);
            
            if (estado && estado !== "ofertando") {
                console.log(`⚠️ Viaje ${viajeId} ya fue tomado mientras limpiábamos`);
                return;
            }
        }

        /*************************************************
         * ✅ ÉXITO
         *************************************************/
        if (resultado === "aceptado") {
            console.log(`✅ Despacho exitoso para viaje ${viajeId}`);

            // 1. Obtener al ganador para NO cancelarle el viaje a él
            const ganadorId = await redis.get(`viaje:ganador:${viajeId}`);

            // 2. Limpiar llaves y emitir cancelación a los "perdedores"
            await Promise.all(enviados.map(async ({ motoristaId }) => {
                if (motoristaId !== ganadorId) {
                    // 🔥 Eliminar la oferta de Redis para que no queden bloqueados
                    await redis.del(getOfferKey(viajeId, motoristaId));
                    await redis.hdel(`motorista:data:${motoristaId}`, "ofertaPendienteKey");
                    await releaseOfferLock({ viajeId, motoristaId });

                    // 📡 Emitir evento al Frontend para que cierre la pantalla de los 15s
                    global.io.to(`motorista:${motoristaId}`)
                        .emit("viaje:tomado", { 
                            viajeId, 
                            status: "tomado_por_otro" 
                        });
                }
            }));

            return;
        }

        /*************************************************
         * ❌ NADIE ACEPTÓ
         *************************************************/
        console.log(`❌ Nadie aceptó el viaje ${viajeId}. Limpiando estados...`);

        await Promise.all(enviados.map(async ({ motoristaId, enViaje }) => {

            if (!enViaje) {
                await redis.hset(`motorista:data:${motoristaId}`, "disponible", "true");
            }

            await redis.del(getOfferKey(viajeId, motoristaId));
            await redis.hdel(`motorista:data:${motoristaId}`, "ofertaPendienteKey");
            await releaseOfferLock({ viajeId, motoristaId });
            await redis.sadd(`viaje:excluidos:${viajeId}`, motoristaId);

            global.io
                .to(`motorista:${motoristaId}`)
                .emit("viaje:tomado", {
                    viajeId,
                    status: "oferta_expirada"
                });
        }));

        await redis.expire(`viaje:excluidos:${viajeId}`, 60);

        await Viaje.updateOne(
            { _id: viajeId, estado: "ofertando" },
            { $set: { estado: "buscando" } }
        );

        await redis.set(`viaje:status:${viajeId}`, "buscando", "EX", 300);

        await matchingQueue.add(
            "buscar-motorista",
            { viajeId, radioKm: 3 },
            {
                delay: 2500,
                jobId: `buscar-retry-${viajeId}-${Date.now()}`,
                removeOnComplete: true,
                removeOnFail: true
            }
        );

    } catch (err) {
        console.error("🚨 Dispatch Error:", err);
    } finally {
        /*************************************************
         * 🔓 liberar lock
         *************************************************/
        try {
            const dataLock = await redis.hgetall(despachoKey);
            await redis.del(despachoKey);

            if (dataLock?.lockId) {
                await serviceLock.liberarLock(viajeId, dataLock.lockId);
            }

        } catch (err) {
            console.error("⚠️ Error liberando lock:", err.message);
        }
    }
}

module.exports = { ejecutar };
