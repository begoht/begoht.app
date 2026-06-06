const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const PhoneVerification = require("../models/PhoneVerification");
const User = require("../models/User");
const { requireInternationalPhone } = require("../utils/phone");

const ALLOWED_ROLES = new Set(["pasajero", "motorista"]);
const PURPOSE_REGISTER = "register";

function appError(message, status = 400, code = "PHONE_VERIFICATION_ERROR") {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function getSecret() {
  const secret = process.env.PHONE_VERIFICATION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw appError("Servicio de verificacion no configurado", 500, "PHONE_SECRET_MISSING");
  }
  return secret;
}

function normalizeRole(rol) {
  const value = String(rol || "").trim().toLowerCase();
  if (!ALLOWED_ROLES.has(value)) {
    throw appError("Rol invalido para verificar telefono", 400, "ROLE_INVALID");
  }
  return value;
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || "";
  return `${phone.slice(0, 4)} **** ${phone.slice(-3)}`;
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendTwilioSms({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!sid || !token || (!from && !messagingServiceSid)) {
    throw appError("Twilio no configurado", 500, "SMS_TWILIO_MISSING");
  }

  const params = new URLSearchParams();
  params.set("To", to);
  params.set("Body", body);
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else {
    params.set("From", from);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw appError(
      payload?.message || "No se pudo enviar el SMS",
      502,
      "SMS_DELIVERY_FAILED"
    );
  }

  return {
    provider: "twilio",
    deliveryId: payload.sid || "",
  };
}

async function sendOtpSms({ telefono, code }) {
  const provider = String(process.env.SMS_PROVIDER || process.env.PHONE_SMS_PROVIDER || "")
    .trim()
    .toLowerCase();
  const body = `BeGO: tu codigo de verificacion es ${code}. Expira en 10 minutos.`;

  if (provider === "twilio") {
    return sendTwilioSms({ to: telefono, body });
  }

  if (process.env.PHONE_OTP_DEV_MODE === "true") {
    console.warn(`PHONE_OTP_DEV_MODE codigo ${code} para ${telefono}`);
    return {
      provider: "dev",
      deliveryId: "dev-mode",
    };
  }

  throw appError(
    "Servicio de SMS no configurado. Activa SMS_PROVIDER=twilio.",
    503,
    "SMS_PROVIDER_MISSING"
  );
}

async function assertPhoneAvailable({ telefono, rol }) {
  const exists = await User.findOne({ telefono, rol }).select("_id").lean();
  if (exists) {
    throw appError(
      rol === "motorista"
        ? "Este telefono ya tiene una cuenta motorista"
        : "Este telefono ya tiene una cuenta pasajero",
      409,
      "PHONE_ALREADY_REGISTERED"
    );
  }
}

async function requestRegisterOtp({ telefono, rol, ip = "", userAgent = "" }) {
  const phone = requireInternationalPhone(telefono);
  const role = normalizeRole(rol);

  await assertPhoneAvailable({ telefono: phone, rol: role });

  const cooldownSeconds = Number(process.env.PHONE_OTP_COOLDOWN_SECONDS || 60);
  const hourlyLimit = Number(process.env.PHONE_OTP_HOURLY_LIMIT || 5);
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);

  const [lastRequest, recentCount] = await Promise.all([
    PhoneVerification.findOne({
      telefono: phone,
      rol: role,
      purpose: PURPOSE_REGISTER,
    }).sort({ createdAt: -1 }).lean(),
    PhoneVerification.countDocuments({
      telefono: phone,
      rol: role,
      purpose: PURPOSE_REGISTER,
      createdAt: { $gte: hourAgo },
    }),
  ]);

  if (lastRequest?.createdAt) {
    const elapsedSeconds = Math.floor((now - new Date(lastRequest.createdAt).getTime()) / 1000);
    if (elapsedSeconds < cooldownSeconds) {
      throw appError(
        `Espera ${cooldownSeconds - elapsedSeconds}s para reenviar el codigo`,
        429,
        "OTP_COOLDOWN"
      );
    }
  }

  if (recentCount >= hourlyLimit) {
    throw appError(
      "Demasiados codigos enviados. Intenta mas tarde.",
      429,
      "OTP_HOURLY_LIMIT"
    );
  }

  const ttlMinutes = Number(process.env.PHONE_OTP_TTL_MINUTES || 10);
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(now + ttlMinutes * 60 * 1000);

  const record = await PhoneVerification.create({
    telefono: phone,
    rol: role,
    purpose: PURPOSE_REGISTER,
    codeHash,
    expiresAt,
    ip,
    userAgent: String(userAgent || "").slice(0, 300),
  });

  try {
    const delivery = await sendOtpSms({ telefono: phone, code });
    record.deliveryProvider = delivery.provider;
    record.deliveryId = delivery.deliveryId || "";
    record.sentAt = new Date();
    await record.save();
  } catch (err) {
    await PhoneVerification.deleteOne({ _id: record._id }).catch(() => {});
    throw err;
  }

  return {
    ok: true,
    telefono: maskPhone(phone),
    expiresInSeconds: ttlMinutes * 60,
    resendAfterSeconds: cooldownSeconds,
  };
}

async function verifyRegisterOtp({ telefono, rol, code }) {
  const phone = requireInternationalPhone(telefono);
  const role = normalizeRole(rol);
  const cleanCode = String(code || "").replace(/\D/g, "");

  if (!/^\d{6}$/.test(cleanCode)) {
    throw appError("Codigo invalido", 400, "OTP_FORMAT_INVALID");
  }

  const maxAttempts = Number(process.env.PHONE_OTP_MAX_ATTEMPTS || 5);
  const record = await PhoneVerification.findOne({
    telefono: phone,
    rol: role,
    purpose: PURPOSE_REGISTER,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select("+codeHash");

  if (!record) {
    throw appError("Codigo vencido o inexistente. Solicita uno nuevo.", 400, "OTP_NOT_FOUND");
  }

  if (record.attempts >= maxAttempts) {
    throw appError("Demasiados intentos. Solicita un codigo nuevo.", 429, "OTP_MAX_ATTEMPTS");
  }

  const ok = await bcrypt.compare(cleanCode, record.codeHash);
  if (!ok) {
    record.attempts += 1;
    await record.save();
    throw appError("Codigo incorrecto", 400, "OTP_INCORRECT");
  }

  record.consumedAt = new Date();
  await record.save();

  const tokenTtl = process.env.PHONE_VERIFICATION_TOKEN_TTL || "15m";
  const token = jwt.sign(
    {
      scope: "phone-verification",
      purpose: PURPOSE_REGISTER,
      telefono: phone,
      rol: role,
      verificationId: String(record._id),
    },
    getSecret(),
    { expiresIn: tokenTtl }
  );

  return {
    ok: true,
    phoneVerificationToken: token,
    telefono: maskPhone(phone),
    expiresIn: tokenTtl,
  };
}

function verifyPhoneVerificationToken({ token, telefono, rol }) {
  const phone = requireInternationalPhone(telefono);
  const role = normalizeRole(rol);

  if (!token) {
    throw appError("Verifica tu telefono antes de crear la cuenta", 400, "PHONE_TOKEN_REQUIRED");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getSecret());
  } catch (err) {
    throw appError("Verificacion de telefono vencida. Solicita otro codigo.", 400, "PHONE_TOKEN_INVALID");
  }

  if (
    decoded?.scope !== "phone-verification" ||
    decoded?.purpose !== PURPOSE_REGISTER ||
    decoded?.telefono !== phone ||
    decoded?.rol !== role
  ) {
    throw appError("La verificacion no corresponde a este telefono", 400, "PHONE_TOKEN_MISMATCH");
  }

  return decoded;
}

module.exports = {
  requestRegisterOtp,
  verifyPhoneVerificationToken,
  verifyRegisterOtp,
};
