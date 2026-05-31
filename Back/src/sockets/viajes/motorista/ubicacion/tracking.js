// trackingMotorista.js
const { redis } = require("../../../../config/redis");
const { actualizarSnapshotMotorista } = require("../motoristaSnapshot.service");
const calcularETA = require("../../pasajeros/services/tracking/calcularETA");
const Viaje = require("../../../../models/Viaje");

module.exports = async (io, motoristaId, { lat, lng }) => {
  try {
    const nLat = Number(lat);
    const nLng = Number(lng);

    if (isNaN(nLat) || isNaN(nLng)) return;

    // 1. OBTENER DATOS DEL MOTORISTA
    const [viajeId, estadoInterno] = await redis.hmget(
      `motorista:data:${motoristaId}`,
      "viajeActualId",
      "estadoInterno"
    );

    if (!viajeId || viajeId === "null") return;

    // 2. CONTEXTO DEL VIAJE (CACHE + FALLBACK DB)
    let ctx = null;
    const ctxKey = `viaje:ctx:${viajeId}`;
    const rawCtx = await redis.get(ctxKey);

    if (rawCtx) {
      try { ctx = JSON.parse(rawCtx); } catch { ctx = null; }
    }

    if (!ctx || !ctx.estado || (ctx.estado === "asignado" && !ctx.origen) || (ctx.estado === "en_curso" && !ctx.destino)) {
      const viaje = await Viaje.findById(viajeId).select("estado origen destino").lean();
      if (!viaje) return;

      ctx = {
        estado: viaje.estado,
        origen: viaje.origen || null,
        destino: viaje.destino || null,
        proximoDestino: viaje.estado === "asignado" ? viaje.origen : (viaje.destino || null)
      };
      
      await redis.set(ctxKey, JSON.stringify(ctx), "EX", 600);
    }

    // 3. DEFINIR TARGET SEGUN ESTADO
    const vaAlOrigen = ["asignado", "llego"].includes(ctx.estado) ||
      ["asignado", "llego"].includes(estadoInterno);
    const target = vaAlOrigen ? ctx.origen : ctx.destino;

    // 4. ETA + DISTANCIA (Usando módulo unificado)
    const { distancia, distanciaKm, eta } = calcularETA({
      motoristaLat: nLat,
      motoristaLng: nLng,
      destinoLat: target?.lat,
      destinoLng: target?.lng
    });

    // 5. REDIS PIPELINE PARA ACTUALIZACIONES DE ESTADO
    const pipeline = redis.multi();
    
    if (distanciaKm != null) {
      pipeline.hset(`motorista:data:${motoristaId}`, "kmRestantes", distanciaKm);
    }

    // Cooldown para DB Snapshot
    const cooldownKey = `snapshot:cooldown:${motoristaId}`;
    pipeline.set(cooldownKey, "1", "NX", "EX", 5);

    const pipelineResults = await pipeline.exec();
    const locked = pipelineResults[pipelineResults.length - 1][1]; // Resultado del SET NX

    if (locked === "OK") {
      await actualizarSnapshotMotorista(motoristaId, {
        kmRestantes: distanciaKm,
        lat: nLat,
        lng: nLng
      });
    }

    // 6. NOTIFICACIÓN DE PROXIMIDAD
    if (ctx.estado === "en_curso") {
      const trackLock = await redis.set(`trayectoria:cooldown:${viajeId}`, "1", "NX", "EX", 5);

      if (trackLock === "OK") {
        const point = JSON.stringify({ lat: nLat, lng: nLng, timestamp: new Date().toISOString() });
        await redis.multi()
          .rpush(`viaje:trayectoria:${viajeId}`, point)
          .ltrim(`viaje:trayectoria:${viajeId}`, -1000, -1)
          .expire(`viaje:trayectoria:${viajeId}`, 86400)
          .exec();
      }
    }

    if (distancia != null && distancia <= 300) {
      const keyNotif = `notificado:proximidad:${viajeId}`;
      const yaNotificado = await redis.set(keyNotif, "1", "NX", "EX", 1800);

      if (yaNotificado === "OK") {
        io.to(`viaje:${viajeId}`).emit("notificacion-proximidad", { metros: distancia });
      }
    }

    // 7. EMIT TRACKING UNIFICADO
    const payload = {
      viajeId,
      lat: nLat,
      lng: nLng,
      estado: ctx.estado,
      origen: ctx.origen,
      destino: ctx.destino,
      proximoDestino: target,
      distancia: distanciaKm,
      eta,
      timestamp: Date.now()
    };

    io.to(`track:${viajeId}`).emit("track:posicion", payload);
    io.to(`viaje:${viajeId}`).emit("viaje:posicion", { lat: nLat, lng: nLng, ts: payload.timestamp });

  } catch (error) {
    console.error("❌ Error en trackingMotorista:", error);
  }
};
