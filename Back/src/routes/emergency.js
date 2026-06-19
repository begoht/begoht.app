const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const EmergencyAlert = require("../models/EmergencyAlert");
const Viaje = require("../models/Viaje");
const authHttp = require("../middleware/authHttp");
const { sendMonitoringAlert } = require("../services/monitoring/alert.service");

const router = express.Router();
const ACTIVE_STATES = ["reservado", "asignado", "llego", "en_curso"];

const emergencyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas alertas. Contacta directamente al soporte BeGO." },
});

router.post("/", emergencyLimiter, authHttp, async (req, res) => {
  try {
    if (req.user.rol !== "pasajero") {
      return res.status(403).json({ error: "Solo disponible para pasajeros" });
    }

    const viajeId = String(req.body?.viajeId || "");
    if (!mongoose.Types.ObjectId.isValid(viajeId)) {
      return res.status(400).json({ error: "Viaje invalido" });
    }

    const viaje = await Viaje.findOne({
      _id: viajeId,
      pasajero: req.user.id,
      estado: { $in: ACTIVE_STATES },
    })
      .select("_id pasajero motorista estado")
      .lean();

    if (!viaje) {
      return res.status(404).json({ error: "No existe un viaje activo para esta alerta" });
    }

    const ubicacion = normalizeLocation(req.body?.ubicacion);
    const alert = await EmergencyAlert.create({
      viaje: viaje._id,
      pasajero: viaje.pasajero,
      motorista: viaje.motorista || null,
      tipo: req.body?.tipo === "INCIDENTE" ? "INCIDENTE" : "SOS_PASAJERO",
      ubicacion,
      userAgent: String(req.get("user-agent") || "").slice(0, 300),
      ip: String(req.ip || req.socket?.remoteAddress || "").slice(0, 120),
    });

    const payload = {
      alertId: alert._id.toString(),
      viajeId: viaje._id.toString(),
      pasajeroId: viaje.pasajero.toString(),
      motoristaId: viaje.motorista?.toString() || null,
      tipo: alert.tipo,
      status: alert.status,
      ubicacion,
      createdAt: alert.createdAt,
    };

    global.io?.to("soporte:admins").to("admins").emit("emergency:new", payload);
    global.io?.to(`pasajero:${req.user.id}`).emit("emergency:received", payload);

    sendMonitoringAlert({
      type: "passenger_emergency",
      severity: "critical",
      title: "SOS de pasajero BeGO",
      message: `Alerta SOS para el viaje ${viaje._id}`,
      meta: payload,
      dedupeKey: `passenger_emergency:${alert._id}`,
      dedupeSeconds: 60,
    }).catch(() => {});

    return res.status(201).json({
      ok: true,
      alertId: alert._id,
      status: alert.status,
      receivedAt: alert.createdAt,
    });
  } catch (error) {
    console.error("Emergency alert error:", error);
    return res.status(500).json({ error: "No se pudo registrar la alerta" });
  }
});

function normalizeLocation(value = {}) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  const accuracy = Number(value?.accuracy);

  return {
    lat: Number.isFinite(lat) && Math.abs(lat) <= 90 ? lat : null,
    lng: Number.isFinite(lng) && Math.abs(lng) <= 180 ? lng : null,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
  };
}

module.exports = router;
