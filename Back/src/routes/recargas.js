const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const auth = require("../middleware/authHttp");

const Wallet = require("../models/Wallet");
const Recarga = require("../models/recarga");
const Viaje = require("../models/Viaje");
const PaymentMethod = require("../models/PaymentMethod");
const PDFDocument = require("pdfkit");
const qr = require("qr-image");
const {
  normalizeProvider,
  providerConfig,
  providerUnavailableMessage,
} = require("../services/paymentMethods.service");
const { ensurePaymentMethodSettings } = require("../services/paymentMethodSettings.service");
const { getCommissionRate, calculateCommission } = require("../services/commission.service");
const { ensurePlatformAccount } = require("../services/platformAccount.service");

function getPublicApiUrl(req) {
  const configuredUrl = process.env.PUBLIC_API_URL || process.env.API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function validarFirma(req, secret) {
  if (!secret) return false;

  const signature = req.headers["x-moncash-signature"] || req.headers["x-natcash-signature"];
  if (!signature) return false;

  const expected = Buffer.from(String(secret));
  const received = Buffer.from(String(signature));

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function parseMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100) / 100;
}

function normalizarTelefono(value = "") {
  return String(value).replace(/[^\d]/g, "");
}

function normalizarOperadora(value = "") {
  return String(value).toLowerCase().trim();
}

function validarMontoRecarga(monto) {
  const max = Number(process.env.RECARGA_CELULAR_MAX || 5000);
  const min = Number(process.env.RECARGA_CELULAR_MIN || 10);

  if (!monto || monto < min || monto > max) {
    return { ok: false, msg: `Monto permitido: HTG ${min} a HTG ${max}` };
  }

  return { ok: true };
}

function validarMontoRecargaWallet(monto) {
  const max = Number(process.env.RECARGA_WALLET_MAX || 100000);
  const min = Number(process.env.RECARGA_WALLET_MIN || 50);

  if (!monto || monto < min || monto > max) {
    return { ok: false, msg: `Monto permitido: HTG ${min} a HTG ${max}` };
  }

  return { ok: true };
}

// ==========================================
// 🔐 Generar Firma BeGO (única e inalterable)
// ==========================================
function generarFirma(userId) {
  return (
    "GM-" +
    userId.toString().slice(-6).toUpperCase() +
    "-" +
    Date.now() +
    "-" +
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
}

// =================================================
// 💳 1️⃣ RECARGA DE CELULAR (usa saldo del Wallet)
// =================================================
router.post("/", auth, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { numero, operadora, monto } = req.body;
    const numeroNormalizado = normalizarTelefono(numero);
    const operadoraNormalizada = normalizarOperadora(operadora);
    const MONTO = parseMoney(monto);

    if (!/^\d{8,15}$/.test(numeroNormalizado)) {
      return res.status(400).json({ ok: false, msg: "Numero de celular invalido" });
    }

    if (!["digicel", "natcom"].includes(operadoraNormalizada)) {
      return res.status(400).json({ ok: false, msg: "Operadora invalida" });
    }

    const montoValido = validarMontoRecarga(MONTO);
    if (!montoValido.ok) {
      return res.status(400).json({ ok: false, msg: montoValido.msg });
    }

    await session.startTransaction();

    const firmaBeGO = generarFirma(req.user.id);

    const wallet = await Wallet.findOneAndUpdate(
      {
        userId: req.user.id,
        $expr: {
          $gte: [
            { $subtract: ["$saldo", { $ifNull: ["$saldoBloqueado", 0] }] },
            MONTO
          ]
        }
      },
      {
        $inc: { saldo: -MONTO },
        $push: {
          movimientos: {
            tipo: "recarga_tel",
            monto: -MONTO,
            descripcion: `Recarga ${operadoraNormalizada} ${numeroNormalizado}`,
            ref: firmaBeGO,
            metadata: {
              numero: numeroNormalizado,
              operadora: operadoraNormalizada
            },
            fecha: new Date()
          }
        }
      },
      { new: true, session }
    );

    if (!wallet) {
      await session.abortTransaction();
      return res.status(400).json({ ok: false, msg: "Saldo insuficiente" });
    }

    const [recarga] = await Recarga.create(
      [{
        userId: req.user.id,
        numero: numeroNormalizado,
        operadora: operadoraNormalizada,
        monto: MONTO,
        tipo: "recarga_celular",
        metodoPago: "wallet",
        estado: "completada",
        firmaBeGO
      }],
      { session }
    );

    await session.commitTransaction();

    if (global.emitWalletUpdate) {
      global.emitWalletUpdate(req.user.id);
    }

    res.json({
      ok: true,
      recarga,
      nuevoSaldo: wallet.saldo
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("❌ Error recarga celular:", error);
    res.status(500).json({ ok: false, msg: "Error procesando recarga" });
  } finally {
    session.endSession();
  }
});

// =================================================
// 💰 2️⃣ INICIAR RECARGA DE WALLET (MonCash / NatCash)
// =================================================
router.post("/wallet/iniciar", auth, async (req, res) => {
  try {
    const { monto, metodoPago } = req.body;
    const MONTO = parseMoney(monto);
    const metodo = normalizeProvider(metodoPago);

    if (!MONTO || MONTO <= 0) {
      return res.status(400).json({ ok: false, msg: "Datos incompletos" });
    }

    const montoValido = validarMontoRecargaWallet(MONTO);
    if (!montoValido.ok) {
      return res.status(400).json({ ok: false, msg: montoValido.msg });
    }

    const method = await PaymentMethod.findOne({
      userId: req.user.id,
      provider: metodo,
      status: "active",
    }).lean();

    if (!method) {
      return res.status(409).json({
        ok: false,
        code: "PAYMENT_METHOD_REQUIRED",
        msg: "Primero asocia una cuenta real para este metodo.",
      });
    }

    const settings = await ensurePaymentMethodSettings();
    const cfg = providerConfig(metodo, settings.methods?.[metodo]);
    const checkoutUrl = process.env[`${metodo.toUpperCase()}_CHECKOUT_URL`];

    if (!cfg.canPay || !checkoutUrl) {
      return res.status(503).json({
        ok: false,
        code: "PROVIDER_NOT_READY",
        provider: metodo,
        msg: providerUnavailableMessage(metodo),
      });
    }

    const firmaBeGO = generarFirma(req.user.id);

    const recarga = await Recarga.create({
      userId: req.user.id,
      monto: MONTO,
      tipo: "recarga_wallet",
      metodoPago: metodo,
      estado: "pendiente",
      firmaBeGO
    });

    const callback = `${getPublicApiUrl(req)}/api/recargas/wallet/callback/${firmaBeGO}`;
    let url;
    try {
      url = new URL(checkoutUrl);
    } catch (urlErr) {
      recarga.estado = "fallida";
      await recarga.save();

      return res.status(503).json({
        ok: false,
        code: "PROVIDER_NOT_READY",
        provider: metodo,
        msg: providerUnavailableMessage(metodo),
      });
    }

    url.searchParams.set("amount", String(MONTO));
    url.searchParams.set("orderId", firmaBeGO);
    url.searchParams.set("callback", callback);

    res.json({ ok: true, recargaId: recarga._id, urlPago: url.toString() });

  } catch (err) {
    console.error(err);
    if (err.message === "PROVIDER_INVALID") {
      return res.status(400).json({ ok: false, msg: "Metodo de pago invalido" });
    }
    res.status(500).json({ ok: false, msg: "Error iniciando pago" });
  }
});

router.post("/wallet/callback/:firma", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const recarga = await Recarga.findOne({ firmaBeGO: req.params.firma }).session(session);

    if (!recarga) {
      await session.abortTransaction();
      return res.status(404).send("NOT FOUND");
    }

    if (recarga.estado === "completada") {
      await session.abortTransaction();
      return res.send("OK"); // idempotente
    }

    // 🔐 Verificar proveedor
    const ok =
      recarga.metodoPago === "moncash"
        ? validarFirma(req, process.env.MONCASH_SECRET)
        : validarFirma(req, process.env.NATCASH_SECRET);

    if (!ok) {
      await session.abortTransaction();
      return res.status(403).send("INVALID SIGNATURE");
    }

    // 💰 Acreditar
    const wallet = await Wallet.findOneAndUpdate(
      { userId: recarga.userId },
      {
        $setOnInsert: {
          userId: recarga.userId,
          saldo: 0,
          saldoBloqueado: 0,
          gananciaEfectivo: 0,
          comisionPendiente: 0
        }
      },
      { upsert: true, new: true, session }
    );

    if (typeof wallet.normalizarDeudaLegacy === "function") {
      wallet.normalizarDeudaLegacy();
    }
    wallet.recargar(recarga.monto, `recarga_${recarga.metodoPago}`, recarga.firmaBeGO);
    await wallet.save({ session });

    recarga.estado = "completada";
    await recarga.save({ session });

    await session.commitTransaction();

    // 🔔 Notificar en tiempo real
    const io = req.app.get("io");
    io.to(recarga.userId.toString()).emit("wallet:update", {
      saldo: wallet.saldo,
      saldoBloqueado: wallet.saldoBloqueado,
    });

    res.send("OK");
  } catch (e) {
    await session.abortTransaction();
    console.error("❌ CALLBACK ERROR", e);
    res.status(500).send("ERROR");
  } finally {
    session.endSession();
  }
});

function endpointViajeDesactivado(message) {
  return (req, res) => {
    res.status(410).json({
      ok: false,
      error: message,
    });
  };
}

router.post(
  "/finalizar/:id",
  auth,
  endpointViajeDesactivado("Endpoint desactivado. Finaliza el viaje desde el flujo seguro del motorista.")
);

router.post(
  "/cancelar/:id",
  auth,
  endpointViajeDesactivado("Endpoint desactivado. Cancela el viaje desde el flujo seguro autorizado.")
);

router.post("/finalizar/:id", auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const viaje = await Viaje.findById(req.params.id).session(session);
    if (!viaje) throw new Error("Viaje no existe");

    if (viaje.estado === "finalizado") return res.json({ ok: true });

    const walletPasajero = await Wallet.findOne({ userId: viaje.pasajero }).session(session);
    const walletMotorista = await Wallet.findOne({ userId: viaje.motorista }).session(session);
    const { wallet: walletPlataforma } = await ensurePlatformAccount(session);
    const total = Number(viaje.precio || 0);
    const commissionRate = await getCommissionRate({ session });
    const comision = calculateCommission(total, commissionRate);
    const pagoMotorista = Math.max(0, total - comision);

    // 💸 pagar al motorista
    walletPasajero.capturar(total, viaje._id);
    if (typeof walletMotorista.normalizarDeudaLegacy === "function") {
      walletMotorista.normalizarDeudaLegacy();
    }
    walletMotorista.recargar(pagoMotorista, "pago_viaje", viaje._id);
    walletPlataforma.recargar(comision, "comision_viaje", viaje._id);

    await walletPasajero.save({ session });
    await walletMotorista.save({ session });
    await walletPlataforma.save({ session });

    viaje.estado = "finalizado";
    viaje.estadoPago = "pagado";
    viaje.comision = comision;
    viaje.pagoMotorista = pagoMotorista;
    viaje.paBeGOrista = pagoMotorista;
    await viaje.save({ session });

    await session.commitTransaction();

    // 🔔 sockets
    req.app.get("io").to(viaje.pasajero.toString()).emit("wallet:update");
    req.app.get("io").to(viaje.motorista.toString()).emit("wallet:update");

    res.json({ ok: true });
  } catch (e) {
    await session.abortTransaction();
    res.status(500).json({ error: e.message });
  } finally {
    session.endSession();
  }
});

router.post("/cancelar/:id", auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const viaje = await Viaje.findById(req.params.id).session(session);
    if (!viaje) throw new Error("No existe");

    const wallet = await Wallet.findOne({ userId: viaje.pasajero }).session(session);

    wallet.liberar(viaje.precio, viaje._id);
    await wallet.save({ session });

    viaje.estado = "cancelado";
    viaje.estadoPago = "reembolsado";
    await viaje.save({ session });

    await session.commitTransaction();

    req.app.get("io").to(viaje.pasajero.toString()).emit("wallet:update");

    res.json({ ok: true });
  } catch (e) {
    await session.abortTransaction();
    res.status(500).json({ error: e.message });
  } finally {
    session.endSession();
  }
});

router.get("/mis-recargas", auth, async (req, res) => {
  try {
    const recargas = await Recarga.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(recargas);

  } catch (err) {
    console.error("❌ Error obteniendo recargas:", err);
    res.status(500).json({ error: "Error obteniendo recargas" });
  }
});




// ======================================
// 📄 PDF PREMIUM
// ======================================
router.get("/pdf/:firma", async (req, res) => {
  try {
    const recarga = await Recarga.findOne({ firmaBeGO: req.params.firma })
      .populate("userId", "nombre");

    if (!recarga) return res.status(404).json({ msg: "No existe" });

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${recarga.firmaBeGO}.pdf`);
    doc.pipe(res);

    doc.rect(0, 0, 612, 792).fill("#0f111a");
    doc.fillColor("#22c55e").fontSize(36).text("BeGO", 50, 50);
    doc.fillColor("#fff").fontSize(14).text("RECIBO OFICIAL", 50, 120);

    doc.text(`Cliente: ${recarga.userId.nombre}`, 50, 180);
    doc.text(`Monto: HTG ${recarga.monto}`, 50, 210);
    doc.text(`Tipo: ${recarga.tipo}`, 50, 240);
    doc.text(`Método: ${recarga.metodoPago}`, 50, 270);
    doc.text(`Fecha: ${new Date(recarga.fecha).toLocaleString()}`, 50, 300);
    doc.text(`Firma: ${recarga.firmaBeGO}`, 50, 330);

    const qrPNG = qr.imageSync(`${getPublicApiUrl(req)}/api/recargas/verificar/${recarga.firmaBeGO}`, { type: "png" });
    doc.image(qrPNG, 400, 200, { width: 150 });

    doc.end();

  } catch (err) {
    res.status(500).json({ msg: "Error PDF" });
  }
});

// ======================================
// 🔎 VERIFICAR
// ======================================
router.get("/verificar/:firma", async (req, res) => {
  const recarga = await Recarga.findOne({ firmaBeGO: req.params.firma })
    .populate("userId", "nombre");

  if (!recarga) return res.json({ valido: false });

  res.json({ valido: true, recarga });
});

// ======================================
// 📜 HISTORIAL
// ======================================
router.get("/", auth, async (req, res) => {
  const recargas = await Recarga.find({ userId: req.user.id }).sort({ fecha: -1 });
  res.json(recargas);
});

module.exports = router;
