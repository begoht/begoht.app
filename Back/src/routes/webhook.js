const express = require("express");
const router = express.Router();
const Viaje = require("../models/Viaje");

/*************************************************
 * 🔔 WEBHOOK DE MONCASH / NATCASH
 * Ellos llaman aquí cuando el pago se completa
 *************************************************/
router.post("/pago", async (req, res) => {
  try {
    const { codigoPago, status, transaccionId } = req.body;

    if (!codigoPago) {
      return res.status(400).json({ error: "Código requerido" });
    }

    const viaje = await Viaje.findOne({ codigoPago });
    if (!viaje) {
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    if (status === "SUCCESS") {
      viaje.estadoPago = "pagado";
      viaje.transaccionPago = transaccionId || "externo";
      await viaje.save();

      console.log("💳 Pago confirmado:", viaje._id);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ webhook:", err);
    res.status(500).json({ error: "Error webhook" });
  }
});

module.exports = router;
