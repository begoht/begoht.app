const express = require("express");
const User = require("../models/User");
const authAdmin = require("../middleware/authAdmin");

const router = express.Router();

router.get("/usuarios", authAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -pinHash -refreshToken")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
});

router.put("/usuarios/:id/rol", authAdmin, async (req, res) => {
  try {
    const { rol } = req.body;

    if (!["pasajero", "motorista", "admin"].includes(rol)) {
      return res.status(400).json({ error: "Rol invalido" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { rol },
      { new: true }
    ).select("-password -pinHash -refreshToken");

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: "Error cambiando rol" });
  }
});

router.put("/usuarios/:id/bloqueo", authAdmin, async (req, res) => {
  try {
    const { saldoBloqueado } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { saldoBloqueado: !!saldoBloqueado },
      { new: true }
    ).select("-password -pinHash -refreshToken");

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: "Error bloqueo" });
  }
});

router.delete("/usuarios/:id", authAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Error eliminando usuario" });
  }
});

module.exports = router;
