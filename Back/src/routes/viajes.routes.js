const express = require("express");
const router = express.Router();
const auth = require("../middleware/authHttp");
const Viaje = require("../models/Viaje");
const Wallet = require("../models/Wallet");
const { getCommissionRate, calculateCommission } = require("../services/commission.service");
const { ensurePlatformAccount } = require("../services/platformAccount.service");
const { normalizeLegacyWalletDebt } = require("../services/driverCommission.service");
const {
  normalizeProvider,
  providerConfig,
  providerUnavailableMessage,
} = require("../services/paymentMethods.service");

/*************************************************
 * 💳 INICIAR PAGO
 *************************************************/
router.post("/iniciar", auth, async (req, res) => {
  try {
    const { viajeId, metodoPago } = req.body;

    if (!viajeId || !metodoPago) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const viaje = await Viaje.findById(viajeId);
    if (!viaje) return res.status(404).json({ error: "Viaje no existe" });

    viaje.metodoPago = metodoPago;
    viaje.estadoPago = metodoPago === "efectivo" ? "pendiente" : "esperando_pago";
    await viaje.save();

    // 💵 EFECTIVO
    if (metodoPago === "efectivo") {
      return res.json({ ok: true, metodo: "efectivo", estadoPago: "pendiente" });
    }

    // 💳 WALLET
    if (metodoPago === "wallet") {
      const wallet = await Wallet.findOne({ userId: viaje.pasajero });
      if (!wallet) return res.status(404).json({ error: "Wallet no existe" });

      wallet.bloquear(viaje.precio, `VIAJE-${viaje._id}`);
      await wallet.save();
      await global.emitWalletUpdate(viaje.pasajero);

      viaje.escrow = viaje.precio;
      viaje.estadoPago = "pagado";
      await viaje.save();

      return res.json({ ok: true, metodo: "wallet", estadoPago: "pagado" });
    }

    // 📱 MONCASH / NATCASH
    const provider = normalizeProvider(metodoPago);
    const cfg = providerConfig(provider);
    const checkoutUrl = process.env[`${provider.toUpperCase()}_CHECKOUT_URL`];

    if (!cfg.canPay || !checkoutUrl) {
      return res.status(503).json({
        ok: false,
        code: "PROVIDER_NOT_READY",
        provider,
        error: providerUnavailableMessage(provider),
      });
    }

    const reference = "GM-" + Date.now();
    viaje.referenciaPago = reference;
    await viaje.save();

    let urlPago;
    try {
      urlPago = new URL(checkoutUrl);
    } catch (urlErr) {
      return res.status(503).json({
        ok: false,
        code: "PROVIDER_NOT_READY",
        provider,
        error: providerUnavailableMessage(provider),
      });
    }

    urlPago.searchParams.set("orderId", reference);
    urlPago.searchParams.set("amount", String(viaje.precio));

    res.json({
      ok: true,
      reference,
      urlPago: urlPago.toString(),
      estadoPago: "esperando_pago",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error iniciando pago" });
  }
});

/*************************************************
 * 🔔 CALLBACK PASARELA
 *************************************************/
router.post("/callback", async (req, res) => {
  try {
    const { reference, status } = req.body;
    const viaje = await Viaje.findOne({ referenciaPago: reference });
    if (!viaje) return res.status(404).json({ error: "Referencia inválida" });

    if (status === "SUCCESS") {
      const wallet = await Wallet.findOne({ userId: viaje.pasajero });
      wallet.bloquear(viaje.precio, `VIAJE-${viaje._id}`);
      await wallet.save();
      await global.emitWalletUpdate(viaje.pasajero);

      viaje.escrow = viaje.precio;
      viaje.estadoPago = "pagado";
      await viaje.save();
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error callback" });
  }
});

/*************************************************
 * 🔓 FINALIZAR VIAJE → LIBERAR ESCROW
 *************************************************/
router.post("/finalizar", auth, async (req, res) => {
  try {
    const { viajeId } = req.body;

    const viaje = await Viaje.findById(viajeId);
    if (!viaje) return res.status(404).json({ error: "Viaje no existe" });

    if (!viaje.escrow || viaje.escrow <= 0) {
      return res.status(400).json({ error: "No hay dinero en escrow" });
    }

    // Wallets
    const walletPasajero = await Wallet.findOne({ userId: viaje.pasajero });
    const walletMotorista = await Wallet.findOneAndUpdate(
      { userId: viaje.motorista },
      {
        $setOnInsert: {
          userId: viaje.motorista,
          saldo: 0,
          saldoBloqueado: 0,
          gananciaEfectivo: 0,
          comisionPendiente: 0,
        },
      },
      { upsert: true, new: true }
    );
    const { wallet: walletBeGO } = await ensurePlatformAccount();

    const total = viaje.escrow;
    const commissionRate = await getCommissionRate();
    const comision = calculateCommission(total, commissionRate);
    const pagoMotorista = total - comision;

    // 🔥 Liberar escrow del pasajero
    walletPasajero.capturar(total, `VIAJE-${viaje._id}`);
    await walletPasajero.save();

    // 🛵 Pagar motorista
    await normalizeLegacyWalletDebt(walletMotorista);
    walletMotorista.recargar(pagoMotorista, "pago_viaje", `VIAJE-${viaje._id}`);
    await walletMotorista.save();

    // 💰 Pagar BeGO
    walletBeGO.recargar(comision, "comision_viaje", `VIAJE-${viaje._id}`);
    await walletBeGO.save();

    viaje.escrow = 0;
    viaje.estado = "finalizado";
    viaje.estadoPago = "pagado";
    viaje.comision = comision;
    viaje.pagoMotorista = pagoMotorista;
    viaje.paBeGOrista = pagoMotorista;
    await viaje.save();

    res.json({
      ok: true,
      pagoMotorista,
      paBeGOrista: pagoMotorista,
      comisionBeGO: comision,
    });
  } catch (err) {
    console.error("❌ Finalizar viaje:", err);
    res.status(500).json({ error: "Error liberando escrow" });
  }
});

/*************************************************
 * 📊 ESTADO
 *************************************************/
router.get("/estado/:viajeId", auth, async (req, res) => {
  const viaje = await Viaje.findById(req.params.viajeId);
  res.json({
    estadoPago: viaje.estadoPago,
    escrow: viaje.escrow,
    estado: viaje.estado,
  });
});

/*************************************************
 * 🔒 CONFIRMAR
 *************************************************/
router.post("/confirmar", auth, async (req, res) => {
  const viaje = await Viaje.findById(req.body.viajeId);
  if (viaje.metodoPago !== "efectivo" && viaje.estadoPago !== "pagado") {
    return res.status(403).json({ error: "Debe pagar primero" });
  }
  viaje.estado = "buscando";
  await viaje.save();
  res.json({ ok: true });
});

module.exports = router;
