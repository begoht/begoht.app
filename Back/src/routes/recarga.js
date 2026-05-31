const express = require("express");
const router = express.Router();

const Wallet = require("../models/Wallet");
const auth = require("../middleware/authHttp");

/*************************************************
 * 📱 HACER RECARGA DE TELÉFONO
 *************************************************/
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id; // 🔒 desde token
    const { numero, monto, operadora } = req.body;

    // =========================
    // VALIDACIONES
    // =========================
    if (!numero || numero.length < 8) {
      return res.status(400).json({ error: "Número inválido" });
    }

    const MONTO = Number(monto);
    if (!MONTO || MONTO <= 0) {
      return res.status(400).json({ error: "Monto inválido" });
    }

    if (!operadora) {
      return res.status(400).json({ error: "Operadora requerida" });
    }

    // =========================
    // BUSCAR WALLET
    // =========================
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet no encontrada" });
    }

    // =========================
    // VALIDAR SALDO
    // =========================
    if (wallet.saldo < MONTO) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    // =========================
    // DESCONTAR SALDO
    // =========================
    wallet.saldo -= MONTO;

    wallet.movimientos.push({
      tipo: "recarga_tel",
      monto: -MONTO,
      numero,
      operadora,
      descripcion: `Recarga ${operadora}`,
      fecha: new Date()
    });

    await wallet.save();

    // 🔔 Emitir actualización si existe
    if (global.emitWalletUpdate) {
      global.emitWalletUpdate(userId);
    }

    // =========================
    // RESPUESTA
    // =========================
    res.json({
      ok: true,
      saldoActual: wallet.saldo,
      recarga: {
        numero,
        operadora,
        monto: MONTO,
        fecha: new Date()
      }
    });

  } catch (err) {
    console.error("❌ Error recarga:", err);
    res.status(500).json({ error: "Error procesando recarga" });
  }
});




module.exports = router;