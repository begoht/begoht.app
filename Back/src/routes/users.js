const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authHttp = require("../middleware/authHttp");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const storage = multer.memoryStorage();
const upload = multer({ storage });

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

    const userClean = user.toObject();
    delete userClean.password;

    res.json(userClean);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error actualizando perfil" });
  }
});


module.exports = router;
