const { Worker } = require("bullmq");
const { redisConfig, redis } = require("../config/redis");
const matchingService = require("../services/matching_services/matching.service");
const Viaje = require("../models/Viaje");
const mongoose = require("mongoose");

let worker;

const ESTADOS_FINALES = ["finalizado", "cancelado", "expirado"];

const initMatchingWorker = () => {
  if (worker) return worker;

  console.log("👷 Worker de Matching inicializado...");

  worker = new Worker(
    "matching-queue",
    async (job) => {
      if (mongoose.connection.readyState !== 1) {
        throw new Error("Mongoose desconectado");
      }

      const { viajeId, candidatosIds, despachoKey, radioKm } = job.data;
      const statusKey = `viaje:status:${viajeId}`;

      console.log(`📥 Job: ${job.name} → ${viajeId}`);

      try {
        let status = await redis.get(statusKey);

        /*************************************************
         * 🧠 RECUPERAR ESTADO DESDE DB SI NO EXISTE
         *************************************************/
        if (!status) {
          const viajeDB = await Viaje.findById(viajeId).select("estado").lean();
          if (!viajeDB) return { status: "no_existe" };

          status = viajeDB.estado;
          await redis.set(statusKey, status, "EX", 600);

          console.log(`🛠️ Estado recuperado desde DB: ${status}`);
        }

        /*************************************************
         * 🛑 BLOQUEO DE ESTADOS FINALES
         *************************************************/
        if (ESTADOS_FINALES.includes(status) || status.startsWith("aceptado")) {
          console.log(`🛑 Skip por estado: ${status}`);
          return { status: "skip" };
        }

        switch (job.name) {

          /*************************************************
           * 🔎 BUSCAR MOTORISTA
           *************************************************/
          case "buscar-motorista": {
            const r = await redis.eval(`
              local s = redis.call('get', KEYS[1])
              if s == 'buscando' then
                redis.call('set', KEYS[1], 'ofertando', 'EX', 300)
                return 'OK'
              end
              return s
            `, 1, statusKey);

            if (r !== "OK") {
              console.log("⚠️ Transición inválida:", r);
              return { status: "invalid_transition", from: r };
            }

            return await matchingService.asignarViaje(viajeId, radioKm || 2);
          }

          /*************************************************
           * 🚀 DESPACHO
           *************************************************/
          case "despacho": {
            if (status !== "ofertando") {
              console.log("⚠️ No está ofertando:", status);
              return { status: "not_offering" };
            }

            if (!candidatosIds?.length) {
              console.log("⚠️ Sin candidatos → ampliar radio");
              return await matchingService.asignarViaje(
                viajeId,
                (radioKm || 2) + 1
              );
            }

            console.log("🚀 Despacho iterativo...");
            return await matchingService.ejecutarDespachoIterativo(
              viajeId,
              candidatosIds,
              despachoKey
            );
          }

          /*************************************************
           * ⏳ EXPIRAR VIAJE (FIX CONTRACT)
           *************************************************/
          case "expirar-viaje": {
            const r = await redis.eval(`
              local s = redis.call('get', KEYS[1])
              local g = redis.call('get', KEYS[2])
              if (s == 'buscando' or s == 'ofertando') and not g then
                redis.call('set', KEYS[1], 'expirado', 'EX', 60)
                return 'OK'
              end
              return 'ABORT'
            `, 2, statusKey, `viaje:ganador:${viajeId}`);
            
            if (r === "OK") {
              await Viaje.updateOne(
                { _id: viajeId },
                { estado: "expirado" }
              );
              
              /*************************************************
               * 🔥 FIX: CONTRATO UNIFICADO CON 'type'
               *************************************************/
              await redis.publish(
                `viaje:canal:${viajeId}`,
                JSON.stringify({
                  type: "estado",
                  estado: "expirado",
                  viajeId
                })
              );
              
              console.log(`⏳ Viaje expirado correctamente`);
              return { status: "expirado" };
            }
            
            console.log("⛔ Expiración abortada");
            return { status: "abort_expiration" };
          }

          default: {
            console.log(`❓ Job desconocido: ${job.name}`);
            return { status: "unknown_job" };
          }
        }

      } catch (err) {
        console.error("🚨 Worker error:", err);
        throw err;
      }
    },
    {
      connection: redisConfig,
      concurrency: 3, // 🔥 importante para estabilidad
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 }
    }
  );

  return worker;
};

module.exports = { initMatchingWorker };
