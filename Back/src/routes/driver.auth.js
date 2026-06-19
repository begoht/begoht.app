const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const {
  phoneLoginCandidates,
  requireInternationalPhone,
} = require("../utils/phone");
const {
  requireEmail,
  verifyEmailVerificationToken,
} = require("../services/emailVerification.service");
const emailVerification = require("../controllers/emailVerification.controller");
const phoneVerification = require("../controllers/phoneVerification.controller");
const authHttp = require("../middleware/authHttp");
const authController = require("../controllers/auth.controller");
const {
  generarAccessToken,
  generarRefreshToken,
} = require("../utils/jwt");
const {
  authLimiter,
  emailOtpLimiter,
  emailOtpVerifyLimiter,
  phoneOtpLimiter,
  phoneOtpVerifyLimiter,
  refreshLimiter,
  registerLimiter,
} = require("../middleware/rateLimits");

const router = express.Router();

router.post("/email/start", emailOtpLimiter, emailVerification.startDriverRegistration);
router.post("/email/verify", emailOtpVerifyLimiter, emailVerification.verifyDriverRegistration);
router.post("/phone/start", phoneOtpLimiter, phoneVerification.startDriverRegistration);
router.post("/phone/verify", phoneOtpVerifyLimiter, phoneVerification.verifyDriverRegistration);
router.post("/password/forgot", emailOtpLimiter, emailVerification.startDriverPasswordReset);
router.post("/password/reset", emailOtpVerifyLimiter, emailVerification.resetDriverPassword);
router.post("/logout", authHttp, authController.logout);

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const {
      nombre,
      telefono,
      email,
      password,
      emailVerificationToken,
      vehiculoMarca,
      vehiculoModelo,
      placa,
    } = req.body;

    if (!nombre || !telefono || !email || !password) {
      return res.status(400).json({ msg: "Faltan datos obligatorios" });
    }

    let telefonoNormalizado;
    try {
      telefonoNormalizado = requireInternationalPhone(telefono);
    } catch (err) {
      return res.status(400).json({
        msg: "Telefono invalido. Usa formato internacional, ejemplo +50937123456",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ msg: "Contrasena minimo 8 caracteres" });
    }

    const emailNormalizado = requireEmail(email);

    verifyEmailVerificationToken({
      token: emailVerificationToken,
      email: emailNormalizado,
      rol: "motorista",
    });

    const existeTelefono = await User.findOne({
      telefono: telefonoNormalizado,
      rol: "motorista",
    }).lean();

    if (existeTelefono) {
      return res.status(409).json({ msg: "Este telefono ya tiene una cuenta motorista" });
    }

    if (emailNormalizado) {
      const existeEmail = await User.findOne({
        email: emailNormalizado,
        rol: "motorista",
      }).lean();

      if (existeEmail) {
        return res.status(409).json({ msg: "Este email ya tiene una cuenta motorista" });
      }
    }

    const hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      nombre,
      telefono: telefonoNormalizado,
      email: emailNormalizado || null,
      password: hash,
      rol: "motorista",
      emailVerificado: true,
      telefonoVerificado: false,
      activo: true,
      verificado: false,
      verificadoAt: null,
      verificadoPor: null,
      disponible: false,
      saldoBloqueado: false,
      vehiculo: {
        marca: vehiculoMarca,
        modelo: vehiculoModelo,
        placa,
      },
    });

    await Wallet.findOneAndUpdate(
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
      { upsert: true, new: true }
    );

    return res.status(201).json({
      msg: "Motorista registrado correctamente",
      user: {
        id: user._id,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error("Driver register error:", err);

    if (err?.status) {
      return res.status(err.status).json({ msg: err.message });
    }

    if (err?.code === 11000) {
      return res.status(409).json({ msg: "Ya existe una cuenta motorista con esos datos" });
    }

    return res.status(500).json({ msg: "Error servidor" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { telefono, password } = req.body;
    const telefonos = phoneLoginCandidates(telefono);

    if (!telefonos.length || !password) {
      return res.status(400).json({ msg: "Faltan datos" });
    }

    const user = await User.findOne({
      telefono: { $in: telefonos },
      rol: "motorista",
    }).select("+password");

    if (!user) {
      return res.status(401).json({ msg: "Usuario no encontrado" });
    }

    if (user.deletedAt || user.activo === false) {
      return res.status(403).json({ msg: "Cuenta eliminada o desactivada" });
    }

    if (user.saldoBloqueado) {
      return res.status(403).json({ msg: "Cuenta bloqueada" });
    }

    if (user.verificado !== true) {
      return res.status(403).json({
        code: "DRIVER_PENDING_VERIFICATION",
        msg: "Cuenta pendiente de verificacion por BeGO",
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ msg: "Contrasena incorrecta" });
    }

    const accessToken = generarAccessToken(user);
    const refreshToken = generarRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    return res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error("Driver login error:", err);
    return res.status(500).json({ msg: "Error servidor" });
  }
});

router.post("/refresh", refreshLimiter, async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ msg: "Refresh token requerido" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findOne({
      _id: decoded.id,
      rol: "motorista",
    });

    if (!user || user.deletedAt || user.activo === false || user.refreshToken !== refreshToken) {
      return res.status(401).json({ msg: "Sesion invalida" });
    }

    if (user.saldoBloqueado) {
      return res.status(403).json({ msg: "Cuenta bloqueada" });
    }

    if (user.verificado !== true) {
      return res.status(403).json({
        code: "DRIVER_PENDING_VERIFICATION",
        msg: "Cuenta pendiente de verificacion por BeGO",
      });
    }

    const accessToken = generarAccessToken(user);
    const nextRefreshToken = generarRefreshToken(user);

    user.refreshToken = nextRefreshToken;
    await user.save();

    return res.json({
      token: accessToken,
      accessToken,
      refreshToken: nextRefreshToken,
      user: {
        id: user._id,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "Sesion expirada"
      : "Sesion invalida";

    return res.status(401).json({ msg });
  }
});

module.exports = router;
