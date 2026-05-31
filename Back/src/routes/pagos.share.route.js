const express = require("express");
const jwt = require("jsonwebtoken");

const Viaje = require("../models/Viaje");
const authHttp = require("../middleware/authHttp");

const router = express.Router();

const ESTADOS_COMPARTIBLES = ["reservado", "asignado", "llego", "en_curso"];

router.post("/viaje/:viajeId/compartir", authHttp, async (req, res) => {
  try {
    const { viajeId } = req.params;

    const viaje = await Viaje.findById(viajeId)
      .select("_id pasajero estado")
      .lean();

    if (!viaje) {
      return res.status(404).json({ ok: false, error: "Viaje no encontrado" });
    }

    if (viaje.pasajero.toString() !== req.user.id) {
      return res.status(403).json({ ok: false, error: "No puedes compartir este viaje" });
    }

    if (!ESTADOS_COMPARTIBLES.includes(viaje.estado)) {
      return res.status(409).json({
        ok: false,
        error: "El viaje aun no esta disponible para seguimiento"
      });
    }

    const token = jwt.sign(
      {
        viajeId: viaje._id.toString(),
        pasajeroId: req.user.id,
        scope: "trip_tracking"
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TRACK_LINK_TTL || "6h" }
    );

    const baseUrl = getPublicBaseUrl(req);
    const url = `${baseUrl}/track/${token}`;

    res.json({ ok: true, url, expiresIn: process.env.TRACK_LINK_TTL || "6h" });
  } catch (err) {
    console.error("Error generando link de seguimiento:", err);
    res.status(500).json({ ok: false, error: "Error interno" });
  }
});

router.get("/seguir/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);

    if (decoded.scope && decoded.scope !== "trip_tracking") {
      return res.status(401).json({ ok: false, error: "Enlace invalido" });
    }

    const viaje = await Viaje.findById(decoded.viajeId)
      .select("estado origen destino precio motorista pasajero rutaPoints trayectoriaReal createdAt")
      .populate("motorista", "nombre apellido foto placa telefono vehiculo vehiculoMarca vehiculoModelo vehiculoColor ubicacion")
      .populate("pasajero", "nombre")
      .lean();

    if (!viaje) {
      return res.status(404).json({ ok: false, error: "Viaje no encontrado" });
    }

    res.json({ ok: true, viaje });
  } catch (err) {
    console.error("Token de seguimiento invalido:", err.message);
    res.status(401).json({ ok: false, error: "Enlace caducado o invalido" });
  }
});

function getPublicBaseUrl(req) {
  const configured =
    process.env.TRACKING_PUBLIC_URL ||
    process.env.FRONT_URL ||
    process.env.PUBLIC_URL;

  if (configured && configured.trim()) {
    return configured.trim().replace(/\/+$/, "");
  }

  const host = req.headers["x-forwarded-host"] || req.get("host");
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  return `${protocol}://${host}`.replace(/\/+$/, "");
}

module.exports = router;
