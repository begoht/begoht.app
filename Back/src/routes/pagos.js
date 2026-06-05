const express = require("express");
const router = express.Router();
const Viaje = require("../models/Viaje");
const PaymentMethod = require("../models/PaymentMethod");
const auth = require("../middleware/authHttp");
const { normalizeProvider, providerConfig } = require("../services/paymentMethods.service");

router.post("/iniciar", auth, async (req, res) => {
  try {
    const { viajeId, metodoPago } = req.body;

    const viaje = await Viaje.findOne({ _id: viajeId, pasajero: req.user.id });
    if (!viaje) {
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    const metodoRaw = String(metodoPago || viaje.metodoPago || "").toLowerCase();

    if (metodoRaw === "efectivo" || metodoRaw === "wallet") {
      return res.status(400).json({ error: "Este metodo no usa pasarela externa." });
    }

    const metodo = normalizeProvider(metodoRaw);

    if (viaje.estadoPago === "pagado") {
      return res.json({ ok: true, mensaje: "Ya esta pagado" });
    }

    const method = await PaymentMethod.findOne({
      userId: req.user.id,
      provider: metodo,
      status: "active",
    }).lean();

    if (!method) {
      return res.status(409).json({
        error: "Primero asocia una cuenta real para este metodo de pago.",
      });
    }

    const cfg = providerConfig(metodo);
    if (!cfg.canPay) {
      return res.status(503).json({
        error: "Proveedor no configurado para cobros reales.",
        code: "PROVIDER_NOT_READY",
        provider: metodo,
      });
    }

    return res.json({
      ok: true,
      provider: metodo,
      monto: viaje.precio,
      estadoPago: viaje.estadoPago,
      mensaje: "Proveedor configurado. Completa la orden con el adaptador real del proveedor.",
    });
  } catch (err) {
    console.error("iniciar pago:", err);

    if (err.message === "PROVIDER_INVALID") {
      return res.status(400).json({ error: "Metodo de pago invalido" });
    }

    return res.status(500).json({ error: "Error iniciando pago" });
  }
});

module.exports = router;
