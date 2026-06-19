const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const Wallet = require("../models/Wallet");
const {
  generarAccessToken,
  generarRefreshToken,
} = require("../utils/jwt");
const {
  phoneLoginCandidates,
  requireInternationalPhone,
} = require("../utils/phone");
const {
  requireEmail,
  verifyEmailVerificationToken,
} = require("../services/emailVerification.service");
const jwt = require("jsonwebtoken");

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeAlias(value = "") {
  const alias = String(value).trim().toLowerCase().replace(/^@+/, "");
  return /^[a-z0-9._-]{3,40}$/.test(alias) && /[a-z]/.test(alias) ? alias : "";
}

function publicUser(user) {
  return {
    id: user._id,
    nombre: user.nombre,
    apellido: user.apellido || "",
    rol: user.rol,
    alias: user.alias || "",
  };
}

exports.register = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const nombre = String(req.body?.nombre || "").trim();
    const apellido = String(req.body?.apellido || "").trim();
    const telefono = requireInternationalPhone(req.body?.telefono);
    const email = requireEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const emailVerificationToken = String(req.body?.emailVerificationToken || "");

    if (!nombre || !telefono || !email || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Contrasena minimo 8 caracteres" });
    }

    verifyEmailVerificationToken({
      token: emailVerificationToken,
      email,
      rol: "pasajero",
    });

    session.startTransaction();

    const existe = await User.findOne({
      rol: "pasajero",
      $or: email ? [{ telefono }, { email }] : [{ telefono }],
    }).session(session);

    if (existe) {
      await session.abortTransaction();
      return res.status(409).json({
        error: existe.telefono === telefono
          ? "Este telefono ya tiene una cuenta pasajero"
          : "Este email ya tiene una cuenta pasajero",
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = new User({
      nombre,
      apellido,
      telefono,
      email,
      password: hash,
      rol: "pasajero",
      emailVerificado: true,
      telefonoVerificado: false,
    });

    await user.save({ session });

    await Wallet.updateOne(
      { userId: user._id },
      {
        $setOnInsert: {
          userId: user._id,
          saldo: 0,
          saldoBloqueado: 0,
          gananciaEfectivo: 0,
          comisionPendiente: 0,
        },
      },
      { upsert: true, session }
    );

    await session.commitTransaction();

    const accessToken = generarAccessToken(user);
    const refreshToken = generarRefreshToken(user);

    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken } }
    );

    return res.json({
      accessToken,
      refreshToken,
      user: publicUser(user),
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Register error:", err);

    if (err?.message === "PHONE_INVALID") {
      return res.status(400).json({
        error: "Telefono invalido. Usa formato internacional, ejemplo +50937123456",
      });
    }

    if (err?.code === "EMAIL_INVALID") {
      return res.status(400).json({ error: "Email invalido" });
    }

    if (err?.status) {
      return res.status(err.status).json({ error: err.message });
    }

    if (err?.code === 11000) {
      return res.status(409).json({ error: "Usuario ya registrado" });
    }

    return res.status(400).json({ error: err.message || "Error en registro" });
  } finally {
    session.endSession();
  }
};

exports.login = async (req, res) => {
  try {
    const identificador = String(req.body?.identificador || "").trim();
    const password = String(req.body?.password || "");

    if (!identificador || !password) {
      return res.status(400).json({ msg: "Faltan datos" });
    }

    const email = normalizeEmail(identificador);
    const alias = email.includes("@") ? "" : normalizeAlias(identificador);
    const search = [];
    phoneLoginCandidates(identificador).forEach((phone) => search.push({ telefono: phone }));
    if (email.includes("@")) search.push({ email });
    if (alias) search.push({ alias });

    if (!search.length) {
      return res.status(400).json({ msg: "Credenciales invalidas" });
    }

    const user = await User.findOne({
      rol: { $in: ["pasajero", "admin"] },
      $or: search,
    }).select("+password");

    if (!user) {
      return res.status(400).json({ msg: "Credenciales invalidas" });
    }

    if (user.deletedAt || user.activo === false) {
      return res.status(403).json({ msg: "Cuenta eliminada o desactivada" });
    }

    if (user.saldoBloqueado) {
      return res.status(403).json({ msg: "Cuenta bloqueada" });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      user.intentosFallidos += 1;

      if (user.intentosFallidos >= 5) {
        user.saldoBloqueado = true;
      }

      await user.save();
      return res.status(400).json({ msg: "Credenciales invalidas" });
    }

    user.intentosFallidos = 0;

    const accessToken = generarAccessToken(user);
    const refreshToken = generarRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    return res.json({
      accessToken,
      refreshToken,
      user: publicUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ msg: "Error servidor" });
  }
};

exports.loginMotorista = async (req, res) => {
  try {
    const telefonoCandidates = phoneLoginCandidates(req.body?.telefono);
    const password = String(req.body?.password || "");

    if (!telefonoCandidates.length || !password) {
      return res.status(400).json({ msg: "Faltan datos" });
    }

    const user = await User.findOne({
      rol: "motorista",
      telefono: { $in: telefonoCandidates },
    }).select("+password");

    if (!user || user.rol !== "motorista") {
      return res.status(400).json({ msg: "Credenciales invalidas" });
    }

    if (user.saldoBloqueado) {
      return res.status(403).json({ msg: "Cuenta bloqueada" });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(400).json({ msg: "Credenciales invalidas" });
    }

    if (user.aprobado === false) {
      return res.status(403).json({
        msg: "Cuenta pendiente de aprobacion",
      });
    }

    const accessToken = generarAccessToken(user);
    const refreshToken = generarRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    return res.json({
      accessToken,
      refreshToken,
      user: publicUser(user),
    });
  } catch (err) {
    console.error("Login motorista error:", err);
    return res.status(500).json({ msg: "Error servidor" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ msg: "Refresh token requerido" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.deletedAt || user.activo === false || user.refreshToken !== refreshToken) {
      return res.status(401).json({ msg: "Sesion invalida" });
    }

    if (user.saldoBloqueado) {
      return res.status(403).json({ msg: "Cuenta bloqueada" });
    }

    const accessToken = generarAccessToken(user);
    const nextRefreshToken = generarRefreshToken(user);

    user.refreshToken = nextRefreshToken;
    await user.save();

    return res.json({
      accessToken,
      refreshToken: nextRefreshToken,
      user: publicUser(user),
    });
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "Sesion expirada"
      : "Sesion invalida";

    return res.status(401).json({ msg });
  }
};

exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.json({ ok: true });

    user.refreshToken = null;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();

    global.io?.in(`user:${user._id}`).emit("session:revoked", {
      reason: "logout",
    });
    global.io?.in(`user:${user._id}`).disconnectSockets(true);

    return res.json({ ok: true });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "No se pudo cerrar la sesion" });
  }
};
