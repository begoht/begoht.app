const express = require("express");
const router = express.Router();
const authAdmin = require("../middleware/authAdmin");
const Retiro = require("../models/retiro");
const Wallet = require("../models/Wallet");

/*************************************************
 * 📋 VER RETIROS
 *************************************************/
router.get("/retiros", authAdmin, async (req, res) => {
  const retiros = await Retiro.find().populate("userId", "nombre email");
  res.json(retiros);
});

/*************************************************
 * 💳 MARCAR COMO PAGADO
 *************************************************/
router.post("/retiros/:id/pagar", authAdmin, async (req, res) => {
  try {
    const retiro = await Retiro.findById(req.params.id);
    if (!retiro || retiro.estado !== "pendiente") {
      return res.status(400).json({ error: "Retiro inválido" });
    }

    retiro.estado = "pagado";
    await retiro.save();

    // 🔓 liberar saldoBloqueado
    const wallet = await Wallet.findOne({ userId: retiro.userId });
    wallet.saldoBloqueado -= retiro.monto;
    wallet.movimientos.push({
      tipo: "retiro_pagado",
      monto: 0,
      referencia: retiro.telefono,
      fecha: new Date(),
    });
    await wallet.save();
    await global.emitWalletUpdate(userId);
    

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error pagando retiro" });
  }
});

module.exports = router;
