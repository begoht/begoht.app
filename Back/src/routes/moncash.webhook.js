const express = require("express");
const router = express.Router();
const Pago = require("../models/pago");
const User = require("../models/User");
const verifyMoncash = require("../middlewares/verifyMoncash");

router.post("/moncash", verifyMoncash, async (req, res) => {
  // webhook
});


/**
 * WEBHOOK MONCASH
 * MonCash llama este endpoint
 */
router.post("/moncash", async (req, res) => {
  try {
    const {
      transactionId,
      reference,
      amount,
      status,
      customerPhone
    } = req.body;

    // Validar estado
    if (status !== "SUCCESS") {
      return res.status(200).json({ ok: true });
    }

    // Buscar pago pendiente
    const pago = await Pago.findOne({
      referencia: reference,
      estado: "pendiente"
    });

    if (!pago) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    // Marcar pago como exitoso
    pago.estado = "exitoso";
    pago.transaccion = transactionId;
    await pago.save();

    // Acreditar saldo
    await User.findByIdAndUpdate(pago.user, {
      $inc: { saldo: pago.monto }
    });

    console.log("✅ Pago MonCash confirmado:", reference);

    // RESPUESTA OBLIGATORIA
    res.status(200).json({ ok: true });

  } catch (err) {
    console.error("❌ Error webhook MonCash", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
