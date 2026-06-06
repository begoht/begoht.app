const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const PaymentMethod = require("../models/PaymentMethod");
const auth = require("../middleware/authHttp");
const {
  allProviderConfig,
  cleanAccountName,
  encryptText,
  hashClientFingerprint,
  hashPhone,
  normalizeHaitiPhone,
  normalizeProvider,
  serializeMethod,
  serializeMethods,
} = require("../services/paymentMethods.service");
const { ensurePaymentMethodSettings } = require("../services/paymentMethodSettings.service");

const router = express.Router();

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas operaciones de pago. Intenta otra vez en un momento." },
});

router.get("/", auth, async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ userId: req.user.id })
      .sort({ isDefault: -1, updatedAt: -1 })
      .lean();
    const settings = await ensurePaymentMethodSettings();
    const providers = allProviderConfig(settings.methods);
    const providerMap = Object.fromEntries(providers.map((provider) => [provider.id, provider]));

    res.json({
      ok: true,
      providers,
      methods: serializeMethods(methods, providerMap),
    });
  } catch (err) {
    console.error("payment-methods list:", err);
    res.status(500).json({ error: "No pudimos cargar tus metodos de pago." });
  }
});

router.post("/", writeLimiter, auth, async (req, res) => {
  const session = await mongoose.startSession();
  let savedMethod = null;

  try {
    const provider = normalizeProvider(req.body.provider);
    const settings = await ensurePaymentMethodSettings();
    const providerConfig = settings.methods?.[provider];
    if (!providerConfig?.canLink) {
      return res.status(503).json({
        error: providerConfig?.unavailableMessage || "Este metodo no esta disponible por ahora.",
      });
    }

    const phone = normalizeHaitiPhone(req.body.phone);
    const accountName = cleanAccountName(req.body.accountName);
    const phoneHash = hashPhone(phone.e164);
    const now = new Date();

    await session.withTransaction(async () => {
      const duplicate = await PaymentMethod.findOne({
        provider,
        phoneHash,
        userId: { $ne: req.user.id },
      })
        .select("_id")
        .session(session)
        .lean();

      if (duplicate) {
        const err = new Error("PHONE_ALREADY_LINKED");
        err.status = 409;
        throw err;
      }

      const existingCount = await PaymentMethod.countDocuments({ userId: req.user.id }).session(session);
      const makeDefault = req.body.makeDefault !== false || existingCount === 0;

      if (makeDefault) {
        await PaymentMethod.updateMany(
          { userId: req.user.id },
          { $set: { isDefault: false } },
          { session }
        );
      }

      savedMethod = await PaymentMethod.findOneAndUpdate(
        { userId: req.user.id, provider },
        {
          $set: {
            provider,
            type: "mobile_money",
            accountName,
            phoneEncrypted: encryptText(phone.e164),
            phoneHash,
            phoneLast4: phone.last4,
            phoneCountry: phone.country,
            status: "active",
            verifiedAt: now,
            isDefault: makeDefault,
            "audit.updatedIpHash": hashClientFingerprint(req),
          },
          $setOnInsert: {
            userId: req.user.id,
            "audit.linkedIpHash": hashClientFingerprint(req),
          },
        },
        { upsert: true, new: true, session }
      );

    });

    res.json({
      ok: true,
      method: serializeMethod(savedMethod),
    });
  } catch (err) {
    console.error("payment-methods save:", err.message);
    const status = err.code === 11000 ? 409 : (err.status || 500);
    const messages = {
      PROVIDER_INVALID: "Proveedor invalido.",
      PHONE_INVALID: "Ingresa un numero haitiano valido de 8 digitos.",
      PHONE_ALREADY_LINKED: "Esta cuenta ya esta asociada a otro usuario.",
      PAYMENT_SECURITY_KEY_MISSING: "Falta configurar la clave segura de pagos.",
    };
    const duplicateMessage = err.code === 11000 ? "Esta cuenta ya esta asociada." : null;
    res.status(status).json({ error: duplicateMessage || messages[err.message] || "No pudimos guardar el metodo de pago." });
  } finally {
    session.endSession();
  }
});

router.patch("/:id/default", writeLimiter, auth, async (req, res) => {
  const session = await mongoose.startSession();
  let updatedMethod = null;

  try {
    await session.withTransaction(async () => {
      const method = await PaymentMethod.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!method) {
        const err = new Error("METHOD_NOT_FOUND");
        err.status = 404;
        throw err;
      }

      await PaymentMethod.updateMany(
        { userId: req.user.id },
        { $set: { isDefault: false } },
        { session }
      );

      method.isDefault = true;
      method.status = "active";
      updatedMethod = await method.save({ session });
    });

    res.json({ ok: true, method: serializeMethod(updatedMethod) });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message === "METHOD_NOT_FOUND" ? "Metodo no encontrado." : "No pudimos actualizar el metodo." });
  } finally {
    session.endSession();
  }
});

router.delete("/:id", writeLimiter, auth, async (req, res) => {
  try {
    const method = await PaymentMethod.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!method) {
      return res.status(404).json({ error: "Metodo no encontrado." });
    }

    const replacement = await PaymentMethod.findOne({ userId: req.user.id })
      .sort({ updatedAt: -1 });

    if (replacement && !replacement.isDefault) {
      replacement.isDefault = true;
      await replacement.save();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("payment-methods delete:", err);
    res.status(500).json({ error: "No pudimos eliminar el metodo." });
  }
});

module.exports = router;
