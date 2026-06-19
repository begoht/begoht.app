const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const EmailVerification = require("../models/EmailVerification");
const User = require("../models/User");
const {
  enviarCodigoVerificacionEmail,
} = require("./email/email.service");

const ALLOWED_ROLES = new Set(["pasajero", "motorista"]);
const PURPOSE_REGISTER = "register";
const PURPOSE_PASSWORD_RESET = "password_reset";

function appError(message, status = 400, code = "EMAIL_VERIFICATION_ERROR") {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function getSecret() {
  const secret =
    process.env.EMAIL_VERIFICATION_SECRET ||
    process.env.PHONE_VERIFICATION_SECRET ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw appError("Servicio de verificacion no configurado", 500, "EMAIL_SECRET_MISSING");
  }

  return secret;
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function requireEmail(value = "") {
  const email = normalizeEmail(value);
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw appError("Email invalido", 400, "EMAIL_INVALID");
  }
  return email;
}

function normalizeRole(rol) {
  const value = String(rol || "").trim().toLowerCase();
  if (!ALLOWED_ROLES.has(value)) {
    throw appError("Rol invalido para verificar email", 400, "ROLE_INVALID");
  }
  return value;
}

function maskEmail(email = "") {
  const [name, domain] = String(email).split("@");
  if (!name || !domain) return "";
  return `${name.slice(0, 2)}***@${domain}`;
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function assertEmailAvailable({ email, rol }) {
  const exists = await User.findOne({ email, rol }).select("_id").lean();
  if (exists) {
    throw appError(
      rol === "motorista"
        ? "Este email ya tiene una cuenta motorista"
        : "Este email ya tiene una cuenta pasajero",
      409,
      "EMAIL_ALREADY_REGISTERED"
    );
  }
}

async function requestRegisterEmailOtp({ email, rol, ip = "", userAgent = "" }) {
  const cleanEmail = requireEmail(email);
  const role = normalizeRole(rol);

  await assertEmailAvailable({ email: cleanEmail, rol: role });

  const cooldownSeconds = Number(process.env.EMAIL_OTP_COOLDOWN_SECONDS || 60);
  const hourlyLimit = Number(process.env.EMAIL_OTP_HOURLY_LIMIT || 5);
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);

  const [lastRequest, recentCount] = await Promise.all([
    EmailVerification.findOne({
      email: cleanEmail,
      rol: role,
      purpose: PURPOSE_REGISTER,
    }).sort({ createdAt: -1 }).lean(),
    EmailVerification.countDocuments({
      email: cleanEmail,
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

  const ttlMinutes = Number(process.env.EMAIL_OTP_TTL_MINUTES || 10);
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(now + ttlMinutes * 60 * 1000);

  const record = await EmailVerification.create({
    email: cleanEmail,
    rol: role,
    purpose: PURPOSE_REGISTER,
    codeHash,
    expiresAt,
    ip,
    userAgent: String(userAgent || "").slice(0, 300),
  });

  try {
    const delivery = await enviarCodigoVerificacionEmail({
      to: cleanEmail,
      code,
      rol: role,
      idempotencyKey: `email-otp-${record._id}`,
    });

    record.deliveryProvider = delivery.provider || "email";
    record.deliveryId = delivery.messageId || "";
    record.sentAt = new Date();
    await record.save();
  } catch (err) {
    await EmailVerification.deleteOne({ _id: record._id }).catch(() => {});
    throw appError(err.message || "No se pudo enviar el codigo", 502, "EMAIL_DELIVERY_FAILED");
  }

  return {
    ok: true,
    email: maskEmail(cleanEmail),
    expiresInSeconds: ttlMinutes * 60,
    resendAfterSeconds: cooldownSeconds,
  };
}

async function verifyRegisterEmailOtp({ email, rol, code }) {
  const cleanEmail = requireEmail(email);
  const role = normalizeRole(rol);
  const cleanCode = String(code || "").replace(/\D/g, "");

  if (!/^\d{6}$/.test(cleanCode)) {
    throw appError("Codigo invalido", 400, "OTP_FORMAT_INVALID");
  }

  const maxAttempts = Number(process.env.EMAIL_OTP_MAX_ATTEMPTS || 5);
  const record = await EmailVerification.findOne({
    email: cleanEmail,
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

  const tokenTtl = process.env.EMAIL_VERIFICATION_TOKEN_TTL || "15m";
  const token = jwt.sign(
    {
      scope: "email-verification",
      purpose: PURPOSE_REGISTER,
      email: cleanEmail,
      rol: role,
      verificationId: String(record._id),
    },
    getSecret(),
    { expiresIn: tokenTtl }
  );

  return {
    ok: true,
    emailVerificationToken: token,
    email: maskEmail(cleanEmail),
    expiresIn: tokenTtl,
  };
}

async function requestPasswordResetEmailOtp({ email, rol, ip = "", userAgent = "" }) {
  const cleanEmail = requireEmail(email);
  const role = normalizeRole(rol);
  const user = await User.findOne({ email: cleanEmail, rol: role })
    .select("_id")
    .lean();

  // Respuesta neutra para no revelar si una cuenta existe.
  if (!user) {
    return {
      ok: true,
      email: maskEmail(cleanEmail),
      expiresInSeconds: Number(process.env.EMAIL_OTP_TTL_MINUTES || 10) * 60,
      resendAfterSeconds: Number(process.env.EMAIL_OTP_COOLDOWN_SECONDS || 60),
    };
  }

  const cooldownSeconds = Number(process.env.EMAIL_OTP_COOLDOWN_SECONDS || 60);
  const hourlyLimit = Number(process.env.EMAIL_OTP_HOURLY_LIMIT || 5);
  const ttlMinutes = Number(process.env.EMAIL_OTP_TTL_MINUTES || 10);
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const [lastRequest, recentCount] = await Promise.all([
    EmailVerification.findOne({
      email: cleanEmail,
      rol: role,
      purpose: PURPOSE_PASSWORD_RESET,
    }).sort({ createdAt: -1 }).lean(),
    EmailVerification.countDocuments({
      email: cleanEmail,
      rol: role,
      purpose: PURPOSE_PASSWORD_RESET,
      createdAt: { $gte: hourAgo },
    }),
  ]);

  if (lastRequest?.createdAt) {
    const elapsed = Math.floor((now - new Date(lastRequest.createdAt).getTime()) / 1000);
    if (elapsed < cooldownSeconds) {
      throw appError(
        `Espera ${cooldownSeconds - elapsed}s para reenviar el codigo`,
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

  const code = generateCode();
  const record = await EmailVerification.create({
    email: cleanEmail,
    rol: role,
    purpose: PURPOSE_PASSWORD_RESET,
    codeHash: await bcrypt.hash(code, 12),
    expiresAt: new Date(now + ttlMinutes * 60 * 1000),
    ip,
    userAgent: String(userAgent || "").slice(0, 300),
  });

  try {
    const delivery = await enviarCodigoVerificacionEmail({
      to: cleanEmail,
      code,
      rol: role,
      purpose: PURPOSE_PASSWORD_RESET,
      idempotencyKey: `password-reset-${record._id}`,
    });
    record.deliveryProvider = delivery.provider || "email";
    record.deliveryId = delivery.messageId || "";
    record.sentAt = new Date();
    await record.save();
  } catch (err) {
    await EmailVerification.deleteOne({ _id: record._id }).catch(() => {});
    throw appError(err.message || "No se pudo enviar el codigo", 502, "EMAIL_DELIVERY_FAILED");
  }

  return {
    ok: true,
    email: maskEmail(cleanEmail),
    expiresInSeconds: ttlMinutes * 60,
    resendAfterSeconds: cooldownSeconds,
  };
}

async function resetPasswordWithEmailOtp({ email, rol, code, newPassword }) {
  const cleanEmail = requireEmail(email);
  const role = normalizeRole(rol);
  const cleanCode = String(code || "").replace(/\D/g, "");
  const password = String(newPassword || "");

  if (!/^\d{6}$/.test(cleanCode)) {
    throw appError("Codigo invalido", 400, "OTP_FORMAT_INVALID");
  }
  if (password.length < 8) {
    throw appError("La contrasena debe tener minimo 8 caracteres", 400, "PASSWORD_WEAK");
  }

  const record = await EmailVerification.findOne({
    email: cleanEmail,
    rol: role,
    purpose: PURPOSE_PASSWORD_RESET,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select("+codeHash");

  if (!record) {
    throw appError("Codigo vencido o inexistente", 400, "OTP_NOT_FOUND");
  }

  const maxAttempts = Number(process.env.EMAIL_OTP_MAX_ATTEMPTS || 5);
  if (record.attempts >= maxAttempts) {
    throw appError("Demasiados intentos. Solicita otro codigo.", 429, "OTP_MAX_ATTEMPTS");
  }

  if (!(await bcrypt.compare(cleanCode, record.codeHash))) {
    record.attempts += 1;
    await record.save();
    throw appError("Codigo incorrecto", 400, "OTP_INCORRECT");
  }

  const user = await User.findOne({ email: cleanEmail, rol: role }).select("+password");
  if (!user) {
    throw appError("Codigo vencido o inexistente", 400, "OTP_NOT_FOUND");
  }

  user.password = await bcrypt.hash(password, 12);
  user.refreshToken = null;
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  await user.save();

  record.consumedAt = new Date();
  await record.save();

  global.io?.in(`user:${user._id}`).emit("session:revoked", {
    reason: "password_reset",
  });
  global.io?.in(`user:${user._id}`).disconnectSockets(true);

  return { ok: true };
}

function verifyEmailVerificationToken({ token, email, rol }) {
  const cleanEmail = requireEmail(email);
  const role = normalizeRole(rol);

  if (!token) {
    throw appError("Verifica tu email antes de crear la cuenta", 400, "EMAIL_TOKEN_REQUIRED");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getSecret());
  } catch (err) {
    throw appError("Verificacion de email vencida. Solicita otro codigo.", 400, "EMAIL_TOKEN_INVALID");
  }

  if (
    decoded?.scope !== "email-verification" ||
    decoded?.purpose !== PURPOSE_REGISTER ||
    decoded?.email !== cleanEmail ||
    decoded?.rol !== role
  ) {
    throw appError("La verificacion no corresponde a este email", 400, "EMAIL_TOKEN_MISMATCH");
  }

  return decoded;
}

module.exports = {
  requestRegisterEmailOtp,
  requestPasswordResetEmailOtp,
  requireEmail,
  resetPasswordWithEmailOtp,
  verifyEmailVerificationToken,
  verifyRegisterEmailOtp,
};
