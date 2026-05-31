const express = require("express");
const router = express.Router();
const auth = require("../middleware/authHttp");
const Viaje = require("../models/Viaje");

/*************************************************
 * 🚕 OBTENER VIAJE ACTIVO
 *************************************************/
router.get("/activo", auth, async (req, res) => {
  try {
    const viaje = await Viaje.findOne({
      pasajero: req.user.id,
      estado: { $in: ["buscando", "aceptado", "en_curso"] },
    })
      // 🔹 IMPORTANTE: Agregamos "vehiculo" al populate para que el front no de error
      .populate("motorista", "nombre telefono vehiculo") 
      .sort({ createdAt: -1 });

    // ✅ Si no hay viaje, devolvemos 200 con null (adiós al error rojo en consola)
    if (!viaje) {
      return res.status(200).json(null);
    }

    res.json(viaje);
  } catch (err) {
    console.error("❌ Error viaje activo:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

/*************************************************
 * 📜 MIS VIAJES
 *************************************************/
router.get("/mis-viajes", auth, async (req, res) => {
  try {
    const filtroUsuario = req.user.rol === "motorista"
      ? { motorista: req.user.id }
      : { pasajero: req.user.id };

    const viajes = await Viaje.find({
      ...filtroUsuario,
    })
      .populate("motorista", "nombre apellido telefono vehiculo")
      .populate("pasajero", "nombre apellido telefono")
      .sort({ createdAt: -1 });

    res.json(viajes);
  } catch (err) {
    console.error("❌ Error mis viajes:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
