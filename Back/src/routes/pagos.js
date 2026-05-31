const express = require("express");
const router = express.Router();
const Viaje = require("../models/Viaje");

/*************************************************
 * 💳 INICIAR PAGO (MonCash / NatCash)
 *************************************************/
router.post("/iniciar", async (req, res) => {
  try {
    const { viajeId } = req.body;

    const viaje = await Viaje.findById(viajeId);
    if (!viaje) {
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    if (viaje.metodoPago === "efectivo") {
      return res.status(400).json({ error: "Este viaje es en efectivo" });
    }

    if (viaje.estadoPago === "pagado") {
      return res.json({ ok: true, mensaje: "Ya está pagado" });
    }

    // 🔐 Código único para el pago
    const codigo = `GM-${viaje._id}-${Date.now()}`;

    viaje.codigoPago = codigo;
    viaje.estadoPago = "pendiente";
    await viaje.save();

    // 🔥 Aquí se conecta luego con MonCash / NatCash
    // Por ahora simulamos el link
    const urlPago = `https://sandbox.moncash.ht/pay?code=${codigo}&amount=${viaje.precio}`;

    res.json({
      ok: true,
      urlPago,
      codigo,
      monto: viaje.precio,
      metodo: viaje.metodoPago,
    });
  } catch (err) {
    console.error("❌ iniciar pago:", err);
    res.status(500).json({ error: "Error iniciando pago" });
  }
});

module.exports = router;
