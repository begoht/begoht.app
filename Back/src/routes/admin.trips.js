const express = require("express");
const mongoose = require("mongoose");

const Viaje = require("../models/Viaje");
const authAdmin = require("../middleware/authAdmin");
const { redis } = require("../config/redis");
const { matchingQueue } = require("../config/queues");
const finalizarViaje = require("../services/finalizarViaje.service");
const {
  getOfferKey,
  getOfferSetKey,
  getOfferMotoristaIds,
  releaseOfferLocksForViaje,
} = require("../services/matching_services/offerLock.service");
const { logAdminAction } = require("../services/adminAudit.service");

const router = express.Router();

const ESTADOS_REASIGNABLES = new Set(["asignado", "llego", "reservado"]);
const ESTADOS_DEMORA_REASIGNABLES = new Set(["asignado", "reservado"]);
const DEFAULT_DELAY_ASSIGNED_MINUTES = parsePositiveInt(
  process.env.REASSIGN_DELAY_ASSIGNED_MINUTES || process.env.REASSIGN_DELAY_MINUTES,
  8
);
const DEFAULT_DELAY_RESERVED_MINUTES = parsePositiveInt(
  process.env.REASSIGN_DELAY_RESERVED_MINUTES || process.env.REASSIGN_RESERVATION_DELAY_MINUTES,
  12
);
const MAX_DELAY_BATCH = 50;

router.get("/viajes/reasignacion-demora", authAdmin, async (req, res) => {
  try {
    const thresholds = readDelayThresholds(req.query);
    const limit = clampInt(req.query.limit, 1, MAX_DELAY_BATCH, MAX_DELAY_BATCH);
    const candidatos = await buscarViajesConDemora({ thresholds, limit });

    return res.json({
      ok: true,
      thresholds,
      total: candidatos.length,
      viajes: candidatos,
    });
  } catch (err) {
    console.error("Error listando demoras de reasignacion:", err);
    return res.status(500).json({ error: "Error listando demoras de reasignacion" });
  }
});

router.post("/viajes/reasignacion-demora/ejecutar", authAdmin, async (req, res) => {
  try {
    const thresholds = readDelayThresholds(req.body);
    const limit = clampInt(req.body?.limit, 1, MAX_DELAY_BATCH, MAX_DELAY_BATCH);
    const motivo = String(req.body?.motivo || "demora_motorista").slice(0, 120);
    const candidatos = await buscarViajesConDemora({ thresholds, limit });
    const resultados = [];

    for (const candidato of candidatos) {
      try {
        const resultado = await reasignarViajeDesdeAdmin({
          req,
          viajeId: candidato._id.toString(),
          motivo,
          queueOrigen: "admin_reasignacion_demora",
          action: "trip.reassign.delay",
          meta: {
            demora: candidato.demora,
          },
        });

        resultados.push({
          viajeId: candidato._id.toString(),
          ok: true,
          estadoAnterior: resultado.estadoAnterior,
          motoristaAnterior: resultado.motoristaAnterior,
        });
      } catch (err) {
        resultados.push({
          viajeId: candidato._id.toString(),
          ok: false,
          error: err.publicMessage || err.message || "No se pudo reasignar",
        });
      }
    }

    const reasignados = resultados.filter((item) => item.ok).length;

    return res.json({
      ok: true,
      thresholds,
      total: candidatos.length,
      reasignados,
      errores: resultados.length - reasignados,
      resultados,
    });
  } catch (err) {
    console.error("Error ejecutando reasignacion por demora:", err);
    return res.status(500).json({ error: "Error ejecutando reasignacion por demora" });
  }
});

router.post("/viajes/:id/reasignar", authAdmin, async (req, res) => {
  const viajeId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(viajeId)) {
    return res.status(400).json({ error: "Viaje invalido" });
  }

  try {
    const motivo = String(req.body?.motivo || "reasignacion_admin").slice(0, 120);
    const resultado = await reasignarViajeDesdeAdmin({
      req,
      viajeId,
      motivo,
      queueOrigen: "admin_reasignacion",
      action: "trip.reassign",
    });

    return res.json(resultado);
  } catch (err) {
    console.error("Error reasignando viaje:", err);
    return res.status(err.status || 500).json({ error: err.publicMessage || "Error reasignando viaje" });
  }
});

router.post("/viajes/:id/finalizar", authAdmin, async (req, res) => {
  const viajeId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(viajeId)) {
    return res.status(400).json({ error: "Viaje invalido" });
  }

  try {
    const viaje = await Viaje.findById(viajeId)
      .select("_id estado motorista pasajero precio metodoPago estadoPago")
      .lean();

    if (!viaje) {
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    if (viaje.estado !== "en_curso") {
      return res.status(400).json({ error: "Solo se pueden finalizar viajes en curso" });
    }

    if (!viaje.motorista) {
      return res.status(400).json({ error: "El viaje no tiene motorista asignado" });
    }

    const motivo = String(req.body?.motivo || "finalizado_por_admin").slice(0, 160);
    const resultado = await finalizarViaje({
      io: global.io,
      socket: null,
      viajeId,
      motoristaId: viaje.motorista.toString(),
      enforceProximity: false,
      enforceDeliveryCode: false,
      source: "admin",
      motivo,
      adminId: req.user._id,
      emitErrors: false,
      throwOnError: true
    });

    await logAdminAction(req, {
      action: "trip.finish",
      entity: "Viaje",
      entityId: viajeId,
      before: {
        estado: viaje.estado,
        motorista: viaje.motorista?.toString() || null,
      },
      after: {
        estado: "finalizado",
        finalizadoPor: "admin",
      },
      meta: {
        motivo,
        pasajeroId: viaje.pasajero?.toString() || null,
      },
    });

    return res.json(resultado);
  } catch (err) {
    console.error("Error finalizando viaje desde admin:", err);
    return res.status(err.status || 500).json({
      error: err.publicMessage || err.message || "Error finalizando viaje"
    });
  }
});

async function reasignarViajeDesdeAdmin({
  req,
  viajeId,
  motivo,
  queueOrigen = "admin_reasignacion",
  action = "trip.reassign",
  meta = {},
}) {
  if (!mongoose.Types.ObjectId.isValid(viajeId)) {
    throw httpError(400, "Viaje invalido");
  }

  const viaje = await Viaje.findById(viajeId);
  if (!viaje) throw httpError(404, "Viaje no encontrado");

  if (!ESTADOS_REASIGNABLES.has(viaje.estado)) {
    throw httpError(400, "Solo se pueden reasignar viajes asignados, llegados o reservados");
  }

  const estadoAnterior = viaje.estado;
  const motoristaAnterior = viaje.motorista ? viaje.motorista.toString() : null;
  const pasajeroId = viaje.pasajero ? viaje.pasajero.toString() : null;

  await limpiarEstadoReasignacion({
    viajeId,
    estadoAnterior,
    motoristaAnterior,
    motivo,
  });

  const actualizado = await Viaje.findOneAndUpdate(
    { _id: viajeId, estado: estadoAnterior },
    {
      $set: {
        estado: "buscando",
        motorista: null,
        motoristaSocket: null,
        motoristaLlegado: false,
        siguienteActivado: false,
        notificacionProximidadEnviada: false,
        enMatching: false,
      },
      $unset: {
        horaAsignado: "",
        aceptadoEn: "",
        asignadoEn: "",
        reservadoEn: "",
        llegadaAt: "",
      },
    },
    { new: true }
  )
    .populate("pasajero", "nombre telefono")
    .populate("motorista", "nombre telefono")
    .lean();

  if (!actualizado) {
    throw httpError(409, "El viaje cambio de estado, recarga el panel");
  }

  await redis.set(`viaje:status:${viajeId}`, "buscando", "EX", 300);

  await matchingQueue.add(
    "buscar-motorista",
    { viajeId, radioKm: 2, origen: queueOrigen },
    {
      jobId: `${queueOrigen}-${viajeId}-${Date.now()}`,
      delay: 500,
      removeOnComplete: true,
      removeOnFail: true,
    }
  );

  if (global.io && pasajeroId) {
    global.io.to(`pasajero:${pasajeroId}`).emit("viaje-buscando", {
      viajeId,
      tipo: actualizado.tipo || "viaje",
      paquete: actualizado.paquete || null,
      reasignado: true,
      motivo,
      timestamp: Date.now(),
    });
  }

  await logAdminAction(req, {
    action,
    entity: "Viaje",
    entityId: viajeId,
    before: {
      estado: estadoAnterior,
      motorista: motoristaAnterior,
    },
    after: {
      estado: actualizado.estado,
      motorista: actualizado.motorista || null,
    },
    meta: {
      motivo,
      pasajeroId,
      ...meta,
    },
  });

  return {
    ok: true,
    viaje: actualizado,
    estadoAnterior,
    motoristaAnterior,
  };
}

async function limpiarEstadoReasignacion({ viajeId, estadoAnterior, motoristaAnterior, motivo }) {
  const ofertaMotoristaIds = await getOfferMotoristaIds(viajeId);
  const releaseMotoristaIds = new Set(ofertaMotoristaIds);
  const pipe = redis.multi();

  for (const motoristaId of ofertaMotoristaIds) {
    pipe.del(getOfferKey(viajeId, motoristaId));
    pipe.hdel(`motorista:data:${motoristaId}`, "ofertaPendienteKey");
    if (motoristaId !== motoristaAnterior && global.io) {
      global.io.to(`motorista:${motoristaId}`).emit("viaje:tomado", {
        viajeId,
        status: "reasignado_admin",
      });
    }
  }

  pipe.del(
    `viaje:ganador:${viajeId}`,
    `despacho:${viajeId}`,
    `despacho:intentos:${viajeId}`,
    `lock:matching:${viajeId}`,
    `viaje:ofertando:${viajeId}`,
    getOfferSetKey(viajeId),
    `viaje:lock:${viajeId}`,
    `viaje:ctx:${viajeId}`
  );

  if (motoristaAnterior) {
    releaseMotoristaIds.add(motoristaAnterior);
    pipe.sadd(`viaje:excluidos:${viajeId}`, motoristaAnterior);
    pipe.expire(`viaje:excluidos:${viajeId}`, 1800);
    pipe.hdel(
      `motorista:data:${motoristaAnterior}`,
      "ofertaPendienteKey",
      "estadoViaje",
      "viajeActual",
      estadoAnterior === "reservado" ? "viajeReservadoId" : "viajeActualId"
    );
    pipe.del(getOfferKey(viajeId, motoristaAnterior));

    if (estadoAnterior === "reservado") {
      pipe.del(`lock:cola:${motoristaAnterior}`, `motorista:${motoristaAnterior}:reservado`);
      pipe.hset(`motorista:data:${motoristaAnterior}`, {
        tieneReserva: "false",
      });
    } else {
      pipe.srem("motoristas:ocupados", motoristaAnterior);
      pipe.hset(`motorista:data:${motoristaAnterior}`, {
        disponible: "true",
        estadoInterno: "disponible",
        tieneReserva: "false",
      });
    }

    if (global.io) {
      global.io.in(`motorista:${motoristaAnterior}`).socketsLeave(`viaje:${viajeId}`);
      global.io.to(`motorista:${motoristaAnterior}`).emit("viaje:cancelado", {
        viajeId,
        motivo,
        reasignado: true,
      });
    }
  }

  await pipe.exec();
  await releaseOfferLocksForViaje(viajeId, [...releaseMotoristaIds]);
}

async function buscarViajesConDemora({ thresholds, limit = MAX_DELAY_BATCH }) {
  const now = new Date();
  const viajes = await Viaje.find({
    estado: { $in: [...ESTADOS_DEMORA_REASIGNABLES] },
    motorista: { $ne: null },
    motoristaLlegado: { $ne: true },
  })
    .populate("pasajero", "nombre telefono")
    .populate("motorista", "nombre telefono")
    .sort({ updatedAt: 1 })
    .limit(250)
    .lean();

  return viajes
    .map((viaje) => agregarInfoDemora(viaje, thresholds, now))
    .filter((viaje) => viaje.demora.reasignable)
    .slice(0, limit);
}

function agregarInfoDemora(viaje, thresholds, now = new Date()) {
  const estado = viaje.estado;
  const thresholdMinutes = estado === "reservado"
    ? thresholds.reservado
    : thresholds.asignado;
  const baseAt = estado === "reservado"
    ? viaje.reservadoEn || viaje.asignadoEn || viaje.horaAsignado || viaje.aceptadoEn || viaje.updatedAt || viaje.createdAt
    : viaje.asignadoEn || viaje.horaAsignado || viaje.aceptadoEn || viaje.updatedAt || viaje.createdAt;
  const fechaBase = baseAt ? new Date(baseAt) : null;
  const elapsedMinutes = fechaBase && !Number.isNaN(fechaBase.getTime())
    ? Math.floor((now.getTime() - fechaBase.getTime()) / 60000)
    : 0;
  const overdueMinutes = Math.max(0, elapsedMinutes - thresholdMinutes);

  return {
    ...viaje,
    demora: {
      reasignable:
        ESTADOS_DEMORA_REASIGNABLES.has(estado) &&
        !viaje.motoristaLlegado &&
        elapsedMinutes >= thresholdMinutes,
      estado,
      desde: fechaBase ? fechaBase.toISOString() : null,
      minutos: elapsedMinutes,
      umbralMinutos: thresholdMinutes,
      excesoMinutos: overdueMinutes,
    },
  };
}

function readDelayThresholds(source = {}) {
  return {
    asignado: clampInt(
      source.asignadoMinutos ?? source.assignedMinutes ?? source.minAsignado,
      1,
      180,
      DEFAULT_DELAY_ASSIGNED_MINUTES
    ),
    reservado: clampInt(
      source.reservadoMinutos ?? source.reservedMinutes ?? source.minReservado,
      1,
      240,
      DEFAULT_DELAY_RESERVED_MINUTES
    ),
  };
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.publicMessage = message;
  return err;
}

module.exports = router;
