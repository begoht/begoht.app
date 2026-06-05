const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const Wallet = require("../models/Wallet");
const {
  generarAccessToken,
  generarRefreshToken,
} = require("../utils/jwt");
const jwt = require("jsonwebtoken");

function normalizePhone(value = "") {
  return String(value).replace(/[^\d+]/g, "").trim();
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
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
    const telefono = normalizePhone(req.body?.telefono);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!nombre || !telefono || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    if (!/^\+?\d{8,15}$/.test(telefono)) {
      return res.status(400).json({ error: "Telefono invalido" });
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Email invalido" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Contrasena minimo 8 caracteres" });
    }

    session.startTransaction();

    const existe = await User.findOne({
      $or: email ? [{ telefono }, { email }] : [{ telefono }],
    }).session(session);

    if (existe) {
      await session.abortTransaction();
      return res.status(409).json({
        error: existe.telefono === telefono
          ? "El telefono ya esta registrado"
          : "El email ya esta registrado",
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = new User({
      nombre,
      apellido,
      telefono,
      email: email || undefined,
      password: hash,
      rol: "pasajero",
    });

    await user.save({ session });

    await Wallet.updateOne(
      { userId: user._id },
      {
        $setOnInsert: {
          userId: user._id,
          saldo: 0,
          saldoBloqueado: 0,
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

    const telefono = normalizePhone(identificador);
    const email = normalizeEmail(identificador);
    const search = [];
    if (telefono) search.push({ telefono });
    if (email.includes("@")) search.push({ email });

    const user = await User.findOne({ $or: search }).select("+password");

    if (!user) {
      return res.status(400).json({ msg: "Credenciales invalidas" });
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
    const telefono = normalizePhone(req.body?.telefono);
    const password = String(req.body?.password || "");

    if (!telefono || !password) {
      return res.status(400).json({ msg: "Faltan datos" });
    }

    const user = await User.findOne({ telefono }).select("+password");

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

    if (!user || user.refreshToken !== refreshToken) {
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
