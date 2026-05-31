const express = require("express");
const router = express.Router();
const auth = require("../middleware/authSocket");
const Wallet = require("../models/wallet");
const Retiro = require("../models/retiro");

/*************************************************
 * 💸 SOLICITAR RETIRO (MOTORISTA)
 *************************************************/
router.post("/solicitar", auth, async (req, res) => {
  try {
    if (req.user.rol !== "motorista") {
      return res.status(403).json({ error: "Solo motoristas" });
    }

    const { metodo, telefono, monto } = req.body;
    const MONTO = Number(monto);

    if (!["moncash", "natcash"].includes(metodo)) {
      return res.status(400).json({ error: "Método inválido" });
    }
    if (!telefono || !MONTO || MONTO <= 0) {
      return res.status(400).json({ error: "Datos inválidos" });
    }

    const wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet || wallet.saldo < MONTO) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    // 🔒 Bloquear fondos
    wallet.saldo -= MONTO;
    wallet.saldoBloqueado = (wallet.saldoBloqueado || 0) + MONTO;
    wallet.movimientos.push({
      tipo: "retiro_pendiente",
      monto: -MONTO,
      referencia: telefono,
      fecha: new Date(),
    });
    await wallet.save();

    const retiro = await Retiro.create({
      userId: req.user.id,
      metodo,
      telefono,
      monto: MONTO,
    });

    res.json({ ok: true, retiro });
  } catch (err) {
    console.error("❌ Error retiro:", err);
    res.status(500).json({ error: "Error solicitando retiro" });
  }
});

module.exports = router;
