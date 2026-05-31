const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const Wallet = require("../models/Wallet");
const {
  generarAccessToken,
  generarRefreshToken,
} = require("../utils/jwt");
const jwt = require("jsonwebtoken");

/*************************************************
 * 🔐 REGISTRO
 *************************************************/
exports.register = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { nombre, apellido, telefono, email, password } = req.body;

    const existe = await User.findOne({ telefono }).session(session);
    if (existe) {
      return res.status(409).json({
        error: "El teléfono ya está registrado"
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const user = new User({
      nombre,
      apellido: apellido || "",
      telefono,
      email: email || null,
      password: hash,
      rol: "pasajero",
    });

    await user.save({ session });

    await Wallet.create(
      [
        {
          userId: user._id,
          saldo: 0,
          saldoBloqueado: 0,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // 🔥 TODO lo que no sea DB va después del commit
    const accessToken = generarAccessToken(user);
    const refreshToken = generarRefreshToken(user);
    
    user.refreshToken = refreshToken;
    await user.save();
    
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido || "",
        rol: user.rol,
        alias: user.alias || "",
      },
    });
      
    } catch (err) {

    // 🔥 Abort solo si la transacción sigue activa
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Register error:", err);
    res.status(400).json({ error: err.message });

  } finally {
    session.endSession();
  }
};

/*************************************************
 * 🔐 LOGIN
 *************************************************/
exports.login = async (req, res) => {
  try {
    const { identificador, password } = req.body;

    if (!identificador || !password)
      return res.status(400).json({ msg: "Faltan datos" });

    const user = await User.findOne({
      $or: [
        { telefono: identificador },
        { email: identificador.toLowerCase() },
      ],
    }).select("+password");

    if (!user)
      return res.status(400).json({ msg: "Credenciales inválidas" });

    if (user.saldoBloqueado)
      return res.status(403).json({ msg: "Cuenta bloqueada" });

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      user.intentosFallidos += 1;

      if (user.intentosFallidos >= 5) {
        user.saldoBloqueado = true;
      }

      await user.save();
      return res.status(400).json({ msg: "Credenciales inválidas" });
    }

    user.intentosFallidos = 0;

    const accessToken = generarAccessToken(user);
    const refreshToken = generarRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido || "",
        rol: user.rol,
        alias: user.alias || "",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Error servidor" });
  }
};

/*************************************************
 * 🛵 LOGIN MOTORISTA
 *************************************************/
exports.loginMotorista = async (req, res) => {
  try {
    const { telefono, password } = req.body;

    if (!telefono || !password)
      return res.status(400).json({ msg: "Faltan datos" });

    const user = await User.findOne({ telefono }).select("+password");

    if (!user || user.rol !== "motorista")
      return res.status(400).json({ msg: "Credenciales inválidas" });

    if (user.saldoBloqueado)
      return res.status(403).json({ msg: "Cuenta bloqueada" });

    const ok = await bcrypt.compare(password, user.password);

    if (!ok)
      return res.status(400).json({ msg: "Credenciales inválidas" });

    if (!user.aprobado)
      return res.status(403).json({
        msg: "Cuenta pendiente de aprobación",
      });

    const accessToken = generarAccessToken(user);
    const refreshToken = generarRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido || "",
        rol: user.rol,
        alias: user.alias || "",
      },
    });
  } catch (err) {
    console.error("Login motorista error:", err);
    res.status(500).json({ msg: "Error servidor" });
  }
};

/*************************************************
 * REFRESH TOKEN
 *************************************************/
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

    res.json({
      accessToken,
      refreshToken: nextRefreshToken,
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido || "",
        rol: user.rol,
        alias: user.alias || "",
      },
    });
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "Sesion expirada"
      : "Sesion invalida";

    res.status(401).json({ msg });
  }
};
