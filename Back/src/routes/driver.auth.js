const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

/*************************************************
 * 🛵 REGISTER DRIVER
 *************************************************/
router.post("/register", async (req, res) => {
  try {
    const {
      nombre,
      telefono,
      email,
      password,
      vehiculoMarca,
      vehiculoModelo,
      placa
    } = req.body;

    if (!nombre || !telefono || !password) {
      return res.status(400).json({ msg: "Faltan datos obligatorios" });
    }

    if (!/^[0-9]{8,15}$/.test(telefono)) {
      return res.status(400).json({ msg: "Teléfono inválido" });
    }

    if (password.length < 8) {
      return res.status(400).json({ msg: "Contraseña mínimo 8 caracteres" });
    }

    const existeTelefono = await User.findOne({ telefono });
    if (existeTelefono) {
      return res.status(409).json({ msg: "Teléfono ya registrado" });
    }

    const hash = await bcrypt.hash(password, 12);

    // 🔥 Crear usuario
    const user = await User.create({
      nombre,
      telefono,
      email: email || null,
      password: hash,
      rol: "motorista",
      activo: true,
      saldoBloqueado: false,
      vehiculo: {
        marca: vehiculoMarca,
        modelo: vehiculoModelo,
        placa
      }
    });

    // 🔥 Crear wallet inmediatamente (PRODUCCIÓN READY)
    await Wallet.findOneAndUpdate(
      { userId: user._id },
      {
        $setOnInsert: {
          userId: user._id,
          saldo: 0,
          saldoBloqueado: 0
        }
      },
      { upsert: true, new: true }
    );

    console.log("💰 Wallet creada para motorista:", user._id);

    res.status(201).json({
      msg: "Motorista registrado correctamente",
      user: {
        id: user._id,
        nombre: user.nombre,
        rol: user.rol
      }
    });

  } catch (err) {
    console.error("Driver register error:", err);
    res.status(500).json({ msg: "Error servidor" });
  }
});


/*************************************************
 * 🛵 LOGIN DRIVER
 *************************************************/
router.post("/login", async (req, res) => {
  try {
    const { telefono, password } = req.body;

    if (!telefono || !password) {
      return res.status(400).json({ msg: "Faltan datos" });
    }

    const user = await User.findOne({ telefono })
      .select("+password");

    if (!user) {
      return res.status(401).json({ msg: "Usuario no encontrado" });
    }

    if (user.rol !== "motorista") {
      return res.status(403).json({ msg: "Usuario no válido para Driver" });
    }

    if (user.saldoBloqueado) {
      return res.status(403).json({ msg: "Cuenta bloqueada" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ msg: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        tokenVersion: user.tokenVersion
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        rol: user.rol
      }
    });

  } catch (err) {
    console.error("Driver login error:", err);
    res.status(500).json({ msg: "Error servidor" });
  }
});

module.exports = router;