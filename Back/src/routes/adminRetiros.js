const express = require("express");
const router = express.Router();
const authAdmin = require("../middleware/authAdmin");
const Retiro = require("../models/retiro");
const Wallet = require("../models/Wallet");

/*************************************************
 * 📋 VER RETIROS
 *************************************************/
router.get("/retiros", authAdmin, async (req, res) => {
  try {
    const retiros = await Retiro.find()
      .populate("userId", "nombre email telefono rol")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(retiros);
  } catch (err) {
    res.status(500).json({ error: "Error listando retiros" });
  }
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
    if (!wallet) {
      return res.status(404).json({ error: "Wallet no encontrada" });
    }

    wallet.saldoBloqueado = Math.max(0, Number(wallet.saldoBloqueado || 0) - Number(retiro.monto || 0));
    wallet.movimientos.push({
      tipo: "retiro_pagado",
      monto: 0,
      ref: retiro.telefono,
      descripcion: "Retiro pagado por admin",
      fecha: new Date(),
    });
    await wallet.save();
    if (typeof global.emitWalletUpdate === "function") {
      await global.emitWalletUpdate(retiro.userId);
    }
    

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error pagando retiro" });
  }
});

module.exports = router;
