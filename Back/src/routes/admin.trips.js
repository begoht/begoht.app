const express = require("express");
const mongoose = require("mongoose");

const Viaje = require("../models/Viaje");
const authAdmin = require("../middleware/authAdmin");
const { redis } = require("../config/redis");
const { matchingQueue } = require("../config/queues");
const {
  getOfferKey,
  getOfferSetKey,
  getOfferMotoristaIds,
  releaseOfferLocksForViaje,
} = require("../services/matching_services/offerLock.service");
const { logAdminAction } = require("../services/adminAudit.service");

const router = express.Router();

const ESTADOS_REASIGNABLES = new Set(["asignado", "llego", "reservado"]);

router.post("/viajes/:id/reasignar", authAdmin, async (req, res) => {
  const viajeId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(viajeId)) {
    return res.status(400).json({ error: "Viaje invalido" });
  }

  try {
    const viaje = await Viaje.findById(viajeId);
    if (!viaje) return res.status(404).json({ error: "Viaje no encontrado" });

    if (!ESTADOS_REASIGNABLES.has(viaje.estado)) {
      return res.status(400).json({
        error: "Solo se pueden reasignar viajes asignados, llegados o reservados",
      });
    }

    const estadoAnterior = viaje.estado;
    const motoristaAnterior = viaje.motorista ? viaje.motorista.toString() : null;
    const pasajeroId = viaje.pasajero ? viaje.pasajero.toString() : null;
    const motivo = String(req.body?.motivo || "reasignacion_admin").slice(0, 120);

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
        },
      },
      { new: true }
    )
      .populate("pasajero", "nombre telefono")
      .populate("motorista", "nombre telefono")
      .lean();

    if (!actualizado) {
      return res.status(409).json({ error: "El viaje cambio de estado, recarga el panel" });
    }

    await redis.set(`viaje:status:${viajeId}`, "buscando", "EX", 300);

    await matchingQueue.add(
      "buscar-motorista",
      { viajeId, radioKm: 2, origen: "admin_reasignacion" },
      {
        jobId: `admin-reasignar-${viajeId}-${Date.now()}`,
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
      action: "trip.reassign",
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
      },
    });

    return res.json({
      ok: true,
      viaje: actualizado,
      estadoAnterior,
      motoristaAnterior,
    });
  } catch (err) {
    console.error("Error reasignando viaje:", err);
    return res.status(500).json({ error: "Error reasignando viaje" });
  }
});

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

module.exports = router;
