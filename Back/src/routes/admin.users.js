const express = require("express");
const User = require("../models/User");
const authAdmin = require("../middleware/authAdmin");
const { logAdminAction } = require("../services/adminAudit.service");

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

    const before = await User.findById(req.params.id)
      .select("rol telefono nombre apellido")
      .lean();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { rol },
      { new: true }
    ).select("-password -pinHash -refreshToken");

    await logAdminAction(req, {
      action: "user.role.update",
      entity: "User",
      entityId: req.params.id,
      before,
      after: user,
    });

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: "Error cambiando rol" });
  }
});

router.put("/usuarios/:id/bloqueo", authAdmin, async (req, res) => {
  try {
    const { saldoBloqueado } = req.body;
    const before = await User.findById(req.params.id)
      .select("saldoBloqueado telefono nombre apellido rol")
      .lean();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { saldoBloqueado: !!saldoBloqueado },
      { new: true }
    ).select("-password -pinHash -refreshToken");

    await logAdminAction(req, {
      action: "user.block.update",
      entity: "User",
      entityId: req.params.id,
      before,
      after: user,
    });

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: "Error bloqueo" });
  }
});

router.put("/usuarios/:id/verificacion", authAdmin, async (req, res) => {
  try {
    const { verificado } = req.body;
    const before = await User.findById(req.params.id)
      .select("verificado telefono nombre apellido rol")
      .lean();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { verificado: !!verificado },
      { new: true }
    ).select("-password -pinHash -refreshToken");

    await logAdminAction(req, {
      action: "user.verification.update",
      entity: "User",
      entityId: req.params.id,
      before,
      after: user,
    });

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: "Error cambiando verificacion" });
  }
});

router.put("/usuarios/:id/disponibilidad", authAdmin, async (req, res) => {
  try {
    const { disponible } = req.body;
    const before = await User.findById(req.params.id)
      .select("disponible telefono nombre apellido rol")
      .lean();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { disponible: !!disponible },
      { new: true }
    ).select("-password -pinHash -refreshToken");

    await logAdminAction(req, {
      action: "user.availability.update",
      entity: "User",
      entityId: req.params.id,
      before,
      after: user,
    });

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: "Error cambiando disponibilidad" });
  }
});

router.delete("/usuarios/:id", authAdmin, async (req, res) => {
  try {
    const before = await User.findById(req.params.id)
      .select("-password -pinHash -refreshToken")
      .lean();

    await User.findByIdAndDelete(req.params.id);

    await logAdminAction(req, {
      action: "user.delete",
      entity: "User",
      entityId: req.params.id,
      before,
      after: null,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Error eliminando usuario" });
  }
});

module.exports = router;
