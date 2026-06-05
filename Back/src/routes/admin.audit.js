const express = require("express");
const authAdmin = require("../middleware/authAdmin");
const AdminAuditLog = require("../models/AdminAuditLog");

const router = express.Router();

router.get("/audit", authAdmin, async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 80)));
    const logs = await AdminAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actor", "nombre apellido telefono alias rol")
      .lean();

    res.json({ ok: true, logs });
  } catch (err) {
    console.error("Admin audit list error:", err);
    res.status(500).json({ error: "No se pudo cargar la auditoria" });
  }
});

module.exports = router;
