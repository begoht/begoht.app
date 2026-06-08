const bcrypt = require("bcrypt");
const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const Viaje = require("../models/Viaje");
const auth = require("../middleware/authHttp");
const WalletService = require("../services/wallet.service");
const { PLATFORM_ALIAS } = require("../config/constants");
const { ensurePlatformAccount } = require("../services/platformAccount.service");
const { serializeWallet, serializeMovements } = require("../services/wallet.presenter");
const {
  getDriverCommissionStatus,
  normalizeLegacyWalletDebt,
} = require("../services/driverCommission.service");

const router = express.Router();
const TRANSFER_MAX = Number(process.env.WALLET_TRANSFER_MAX || 1000000);
const MANUAL_RECHARGE_MAX = Number(process.env.WALLET_MANUAL_RECHARGE_MAX || 50000);

const walletWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas operaciones. Intenta otra vez en un momento." },
});

const pinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intenta mas tarde." },
});

function parseMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100) / 100;
}

function normalizeAlias(alias = "") {
  return String(alias).toLowerCase().trim();
}

function normalizePhone(value = "") {
  return String(value).replace(/[^\d+]/g, "").trim();
}

function isWeakPin(pin) {
  const value = String(pin || "");
  if (!/^\d{4}$/.test(value)) return true;
  return ["0000", "1111", "1234", "4321", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"].includes(value);
}

function getClientFingerprint(req) {
  return {
    ip: req.ip || req.headers["x-forwarded-for"] || null,
    userAgent: req.get("user-agent") || null,
  };
}

function getIdempotencyKey(req) {
  const raw = req.get("Idempotency-Key") || req.body.idempotencyKey;
  if (!raw) return null;
  return String(raw).trim().slice(0, 80);
}

/*************************************************
 * 🔎 BUSCAR USUARIO POR ALIAS (NUEVO)
 *************************************************/
router.get("/buscar-alias/:alias", auth, async (req, res) => {
  try {
    const { alias } = req.params;

    const aliasNormalizado = normalizeAlias(alias);
    const telefono = normalizePhone(alias);

    if (aliasNormalizado === PLATFORM_ALIAS) {
      await ensurePlatformAccount();
    }

    const search = [{ alias: aliasNormalizado }];
    if (telefono.length >= 6) {
      search.push({ telefono });
      if (!telefono.startsWith("+")) search.push({ telefono: `+${telefono}` });
    }

    const usuario = await User.findOne({ $or: search })
    .select("nombre apellido foto alias")
    .lean();

    if (!usuario) {
      return res.status(404).json({ error: "Alias no encontrado" });
    }

    if (usuario._id.toString() === req.user.id) {
      return res.status(400).json({ error: "No puedes transferirte a ti mismo" });
    }

    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: "Error al buscar alias" });
  }
});

/*************************************************
 * 🔎 OBTENER / CREAR WALLET
 *************************************************/
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await Wallet.create({ userId });
    }

    await normalizeLegacyWalletDebt(wallet);

    // 🔎 Buscamos si el usuario tiene pinHash configurado
    const usuario = await User.findById(userId).select("+pinHash");
    const commissionStatus = await getDriverCommissionStatus(userId, { wallet });
    
    // Convertimos a objeto para añadirle la propiedad virtual
    res.json(serializeWallet(wallet, {
      ...commissionStatus,
      tienePin: !!(usuario && usuario.pinHash)
    }));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*************************************************
 * ➕ RECARGA
 *************************************************/
router.post("/recarga", walletWriteLimiter, auth, async (req, res) => {
  try {
    const userId = req.user.id; // 🔥 viene del token
    const { monto, referencia } = req.body;

    if (process.env.ALLOW_MANUAL_WALLET_RECHARGE !== "true") {
      return res.status(403).json({
        error: "Recarga manual deshabilitada. Usa el flujo verificado de pago.",
      });
    }

    const MONTO = parseMoney(monto);
    if (!MONTO || MONTO <= 0 || MONTO > MANUAL_RECHARGE_MAX) {
      return res.status(400).json({ error: "Monto inválido" });
    }

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({ userId });
    }

    await normalizeLegacyWalletDebt(wallet);
    wallet.recargar(MONTO, "recarga_wallet", referencia || null);
    await wallet.save();

    await global.emitWalletUpdate(userId);

    res.json(serializeWallet(wallet, { movementsLimit: 8 }));

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/*************************************************
 * 🔒 BLOQUEAR SALDO PARA VIAJE
 *************************************************/
router.post("/bloquear-viaje", auth, async (req, res) => {
  try {
    const { viajeId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(viajeId)) {
      return res.status(400).json({ error: "ViajeId inválido" });
    }

    const viaje = await Viaje.findOne({ _id: viajeId, pasajero: req.user.id })
      .select("_id metodoPago")
      .lean();

    if (!viaje) {
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    if (viaje.metodoPago !== "wallet") {
      return res.status(400).json({ error: "Este viaje no usa Wallet BeGO" });
    }

    await WalletService.bloquearViaje(viajeId);

    res.json({ ok: true });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/enviar", walletWriteLimiter, auth, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { aliasDestino, monto, pin } = req.body;
    const userId = req.user.id;
    const MONTO = parseMoney(monto);
    const idempotencyKey = getIdempotencyKey(req);
    const transferRef = idempotencyKey
      ? `transfer:${userId}:${idempotencyKey}`
      : `transfer:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

    // ================================
    // 🔎 VALIDACIONES INICIALES
    // ================================
    if (!aliasDestino || !MONTO || MONTO <= 0) {
      return res.status(400).json({ error: "Monto o destinatario inválidos" });
    }

    if (MONTO > TRANSFER_MAX) {
      return res.status(400).json({ error: "Monto excede límite permitido" });
    }

    if (!/^\d{4}$/.test(String(pin || ""))) {
      return res.status(400).json({ error: "PIN requerido" });
    }

    await session.startTransaction();

    // ================================
    // 🔐 VALIDAR PIN CON BLOQUEO
    // ================================
    const usuario = await User.findById(userId)
    .select("alias +pinHash +pinIntentos +pinBloqueadoHasta")
    .session(session);

    if (!usuario || !usuario.pinHash) {
      throw new Error("PIN no configurado");
    }

    // Si está saldoBloqueado
    if (
      usuario.pinBloqueadoHasta &&
      usuario.pinBloqueadoHasta > Date.now()
    ) {
      throw new Error("PIN saldoBloqueado temporalmente. Intenta más tarde.");
    }

    const pinValido = await bcrypt.compare(pin, usuario.pinHash);

    if (!pinValido) {
      usuario.pinIntentos += 1;

      if (usuario.pinIntentos >= 5) {
        usuario.pinBloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        usuario.pinIntentos = 0;
      }

      await usuario.save({ session });
      throw new Error("PIN incorrecto");
    }

    // Reset intentos si es correcto
    usuario.pinIntentos = 0;
    usuario.pinBloqueadoHasta = null;
    await usuario.save({ session });

    // ================================
    // 👤 BUSCAR DESTINATARIO
    // ================================
    const aliasNormalizado = normalizeAlias(aliasDestino);

    if (aliasNormalizado === PLATFORM_ALIAS) {
      await ensurePlatformAccount(session);
    }

    const usuarioDestino = await User.findOne({
      alias: aliasNormalizado,
    }).session(session);

    if (!usuarioDestino) {
      throw new Error("El alias de destino no existe");
    }

    if (usuarioDestino._id.toString() === userId) {
      throw new Error("No puedes enviarte dinero a ti mismo");
    }

    if (aliasNormalizado === PLATFORM_ALIAS) {
      await pagarComisionPendiente({
        userId,
        usuario,
        usuarioDestino,
        monto: MONTO,
        transferRef,
        idempotencyKey,
        req,
        session
      });

      await session.commitTransaction();

      setTimeout(() => {
        if (global.emitWalletUpdate) {
          global.emitWalletUpdate(userId);
          global.emitWalletUpdate(usuarioDestino._id.toString());
        }
      }, 300);

      return res.json({
        ok: true,
        msg: "Comision pagada a BeGO correctamente",
      });
    }

    // ================================
    // 💰 UPDATE ATÓMICO WALLET ORIGEN
    // ================================
    const origenQuery = {
      userId,
      $expr: {
        $gte: ["$saldo", MONTO]
      }
    };

    if (idempotencyKey) {
      origenQuery.movimientos = { $not: { $elemMatch: { ref: transferRef } } };
    }

    const walletOrigen = await Wallet.findOneAndUpdate(
      origenQuery,
      {
        $inc: {
          saldo: -MONTO,
        },
        $push: {
          movimientos: {
            tipo: "transferencia_enviada",
            monto: -MONTO,
            descripcion: `A: @${usuarioDestino.alias}`,
            ref: transferRef,
            metadata: getClientFingerprint(req),
            fecha: new Date(),
          },
        },
      },
      { new: true, session }
    );

    if (!walletOrigen) {
      if (idempotencyKey) {
        const yaProcesada = await Wallet.exists({
          userId,
          movimientos: { $elemMatch: { ref: transferRef, tipo: "transferencia_enviada" } },
        }).session(session);

        if (yaProcesada) {
          await session.commitTransaction();
          return res.json({ ok: true, msg: "Transferencia ya procesada" });
        }
      }

      throw new Error("Saldo insuficiente");
    }

    // ================================
    // 💳 WALLET DESTINO
    // ================================
    const walletDestino = await Wallet.findOneAndUpdate(
      { userId: usuarioDestino._id },
      {
        $inc: {
          saldo: MONTO,
        },
        $push: {
          movimientos: {
            tipo: "transferencia_recibida",
            monto: MONTO,
            descripcion: `De: @${usuario.alias}`,
            ref: transferRef,
            metadata: getClientFingerprint(req),
            fecha: new Date(),
          },
        },
      },
      {
        upsert: true,
        new: true,
        session,
      }
    );

    // ================================
    // ✅ CONFIRMAR TRANSACCIÓN
    // ================================
    await session.commitTransaction();

    // ================================
    // 🔔 NOTIFICACIONES ASÍNCRONAS
    // ================================
    setTimeout(() => {
      if (global.emitWalletUpdate) {
        global.emitWalletUpdate(userId);
        global.emitWalletUpdate(usuarioDestino._id.toString());
      }
    }, 300);

    res.json({
      ok: true,
      msg: "Transferencia realizada con éxito",
    });

  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("❌ Error en transferencia:", err.message);

    res.status(400).json({
      error: err.message || "Error en transferencia",
    });
  } finally {
    session.endSession();
  }
});

async function pagarComisionPendiente({
  userId,
  usuario,
  usuarioDestino,
  monto,
  transferRef,
  idempotencyKey,
  req,
  session
}) {
  const walletActual = await Wallet.findOne({ userId }).session(session);
  if (!walletActual) {
    throw new Error("Wallet no encontrada");
  }

  await normalizeLegacyWalletDebt(walletActual, { session });

  const origenQuery = {
    userId,
    saldo: { $gte: monto },
    comisionPendiente: { $gte: monto }
  };

  if (idempotencyKey) {
    origenQuery.movimientos = { $not: { $elemMatch: { ref: transferRef } } };
  }

  const walletOrigen = await Wallet.findOneAndUpdate(
    origenQuery,
    {
      $inc: {
        saldo: -monto,
        comisionPendiente: -monto,
      },
      $push: {
        movimientos: {
          tipo: "pago_comision_enviada",
          monto: -monto,
          descripcion: `Pago de comision a @${usuarioDestino.alias}`,
          ref: transferRef,
          metadata: getClientFingerprint(req),
          fecha: new Date(),
        },
      },
    },
    { new: true, session }
  );

  if (!walletOrigen) {
    if (idempotencyKey) {
      const yaProcesada = await Wallet.exists({
        userId,
        movimientos: { $elemMatch: { ref: transferRef, tipo: "pago_comision_enviada" } },
      }).session(session);

      if (yaProcesada) return;
    }

    const walletEstado = await Wallet.findOne({ userId })
      .select("saldo comisionPendiente")
      .lean()
      .session(session);

    if (Number(walletEstado?.comisionPendiente || 0) < monto) {
      throw new Error("El monto supera la comision pendiente");
    }

    if (Number(walletEstado?.saldo || 0) < monto) {
      throw new Error("Saldo disponible insuficiente para pagar la comision");
    }

    throw new Error("No se pudo pagar la comision pendiente");
  }

  await Wallet.findOneAndUpdate(
    { userId: usuarioDestino._id },
    {
      $setOnInsert: {
        userId: usuarioDestino._id,
        saldoBloqueado: 0,
        gananciaEfectivo: 0,
        comisionPendiente: 0,
      },
      $inc: { saldo: monto },
      $push: {
        movimientos: {
          tipo: "comision_transferida",
          monto,
          descripcion: `Comision recibida de @${usuario.alias}`,
          ref: transferRef,
          metadata: getClientFingerprint(req),
          fecha: new Date(),
        },
      },
    },
    { upsert: true, new: true, session }
  );
}


router.post("/validar-pin", pinLimiter, auth, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: "PIN requerido" });
    }

    const usuario = await User.findById(req.user.id)
    .select("+pinHash +pinIntentos +pinBloqueadoHasta");

    if (!usuario || !usuario.pinHash) {
      return res.status(400).json({ error: "PIN no configurado" });
    }

    if (
      usuario.pinBloqueadoHasta &&
      usuario.pinBloqueadoHasta > Date.now()
    ) {
      return res.status(400).json({
        error: "PIN saldoBloqueado temporalmente",
      });
    }

    const pinValido = await bcrypt.compare(pin, usuario.pinHash);

    if (!pinValido) {
      usuario.pinIntentos += 1;

      if (usuario.pinIntentos >= 5) {
        usuario.pinBloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000);
        usuario.pinIntentos = 0;
      }

      await usuario.save();
      return res.status(400).json({ error: "PIN incorrecto" });
    }

    usuario.pinIntentos = 0;
    usuario.pinBloqueadoHasta = null;
    await usuario.save();

    res.json({ ok: true });

  } catch (err) {
    res.status(500).json({ error: "Error validando PIN" });
  }
});

router.post("/configurar-pin", pinLimiter, auth, async (req, res) => {
  try {
    const { pin } = req.body;

    if (isWeakPin(pin)) {
      return res.status(400).json({ error: "PIN demasiado inseguro" });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: "PIN debe tener 4 dígitos numéricos" });
    }

    const usuario = await User.findById(req.user.id)
      .select("+pinHash");

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (usuario.pinHash) {
      return res.status(400).json({ error: "PIN ya configurado" });
    }

    usuario.pinHash = await bcrypt.hash(pin, 10);
    usuario.pinIntentos = 0;
    usuario.pinBloqueadoHasta = null;

    await usuario.save();

    res.json({ ok: true });

  } catch (err) {
    res.status(500).json({ error: "Error configurando PIN" });
  }
});

router.post("/cambiar-pin", pinLimiter, auth, async (req, res) => {
  try {
    const { pinActual, nuevoPin } = req.body;

    if (isWeakPin(nuevoPin)) {
      return res.status(400).json({ error: "Nuevo PIN inválido" });
    }

    const usuario = await User.findById(req.user.id)
      .select("+pinHash");

    if (!usuario || !usuario.pinHash) {
      return res.status(400).json({ error: "PIN no configurado" });
    }

    const esValido = await bcrypt.compare(pinActual, usuario.pinHash);

    if (!esValido) {
      return res.status(400).json({ error: "PIN actual incorrecto" });
    }

    usuario.pinHash = await bcrypt.hash(nuevoPin, 10);
    usuario.pinIntentos = 0;
    usuario.pinBloqueadoHasta = null;

    await usuario.save();

    res.json({ ok: true, msg: "PIN actualizado correctamente" });

  } catch (err) {
    res.status(500).json({ error: "Error cambiando PIN" });
  }
});

/*************************************************
 * ❌ CANCELAR VIAJE (LIBERAR ESCROW)
 *************************************************/
router.post("/liberar-viaje", auth, async (req, res) => {
  try {
    const { viajeId, penalidad } = req.body;

    if (!mongoose.Types.ObjectId.isValid(viajeId)) {
      return res.status(400).json({ error: "ViajeId inválido" });
    }

    const viaje = await Viaje.findOne({ _id: viajeId, pasajero: req.user.id })
      .select("_id estadoPago")
      .lean();

    if (!viaje) {
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    await WalletService.cancelarViaje(
      viajeId,
      Number(penalidad) || 0
    );

    res.json({ ok: true });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/*************************************************
 * 📜 OBTENER HISTORIAL DE MOVIMIENTOS
 *************************************************/
router.get("/movimientos", auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.id })
      .select("movimientos saldo saldoBloqueado");

    if (!wallet) {
      return res.json([]);
    }

    res.json(serializeMovements(wallet.movimientos, req.query.limit));

  } catch (err) {
    res.status(500).json({ error: "Error obteniendo movimientos" });
  }
});

module.exports = router;
