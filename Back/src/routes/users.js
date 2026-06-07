const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authHttp = require("../middleware/authHttp");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { requireInternationalPhone } = require("../utils/phone");

const storage = multer.memoryStorage();
const upload = multer({ storage });

function cleanUser(user) {
  const userClean = user.toObject ? user.toObject() : { ...user };
  delete userClean.password;
  delete userClean.pinHash;
  delete userClean.refreshToken;
  return userClean;
}

// PUT /api/users/profile
router.put("/profile", authHttp, upload.single("foto"), async (req, res) => {
  try {
    const { nombre, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    user.nombre = nombre || user.nombre;
    user.email = email || user.email;

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "BeGO" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      user.foto = result.secure_url;
    }

    await user.save();

    res.json(cleanUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error actualizando perfil" });
  }
});

// PATCH /api/users/phone
router.patch("/phone", authHttp, async (req, res) => {
  try {
    const telefono = requireInternationalPhone(req.body?.telefono);
    const password = String(req.body?.password || "");

    if (!password) {
      return res.status(400).json({ error: "La contrasena actual es obligatoria" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ error: "Contrasena actual incorrecta" });
    }

    const exists = await User.findOne({
      _id: { $ne: user._id },
      rol: user.rol,
      telefono,
    }).select("_id").lean();

    if (exists) {
      return res.status(409).json({ error: "Este telefono ya esta registrado para este tipo de cuenta" });
    }

    const changed = user.telefono !== telefono;
    user.telefono = telefono;
    if (changed) user.telefonoVerificado = false;

    await user.save();

    res.json({
      ok: true,
      changed,
      user: cleanUser(user),
      message: changed
        ? "Telefono actualizado. Verificacion pendiente."
        : "Telefono sin cambios.",
    });
  } catch (err) {
    if (err?.message === "PHONE_INVALID") {
      return res.status(400).json({ error: "Telefono invalido. Usa formato internacional, ejemplo +50937123456" });
    }

    console.error("Error actualizando telefono:", err);
    res.status(500).json({ error: "Error actualizando telefono" });
  }
});

// PATCH /api/users/password
router.patch("/password", authHttp, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Completa la contrasena actual y la nueva" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "La nueva contrasena debe tener minimo 8 caracteres" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const passwordOk = await bcrypt.compare(currentPassword, user.password);
    if (!passwordOk) {
      return res.status(401).json({ error: "Contrasena actual incorrecta" });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({ error: "La nueva contrasena debe ser diferente" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    user.refreshToken = null;
    await user.save();

    res.json({
      ok: true,
      message: "Contrasena actualizada. Vuelve a iniciar sesion.",
    });
  } catch (err) {
    console.error("Error actualizando contrasena:", err);
    res.status(500).json({ error: "Error actualizando contrasena" });
  }
});

// PATCH /api/users/location
router.patch("/location", authHttp, async (req, res) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: "Ubicacion invalida" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { ubicacionActual: { lat, lng } } },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      ok: true,
      ubicacionActual: user.ubicacionActual,
      message: "Ubicacion actualizada",
    });
  } catch (err) {
    console.error("Error actualizando ubicacion:", err);
    res.status(500).json({ error: "Error actualizando ubicacion" });
  }
});


module.exports = router;
