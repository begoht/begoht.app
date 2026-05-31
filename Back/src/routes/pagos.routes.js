const express = require("express");
const router = express.Router();
const Pago = require("../models/Pago");
const User = require("../models/User");

// CREAR PAGO
router.post("/crear", async (req, res) => {
  const { userId, metodo, monto } = req.body;

  const pago = await Pago.create({
    user: userId,
    metodo,
    monto,
    estado: "pendiente"
  });

  // 👉 acá llamás a MonCash / NatCash / Stripe
  res.json(pago);
});

// CONFIRMAR PAGO (webhook)
router.post("/confirmar", async (req, res) => {
  const { pagoId, referencia } = req.body;

  const pago = await Pago.findById(pagoId);
  pago.estado = "exitoso";
  pago.referencia = referencia;
  await pago.save();

  // acreditar saldo
  await User.findByIdAndUpdate(pago.user, {
    $inc: { saldo: pago.monto }
  });

  res.json({ ok: true });
});

module.exports = router;
