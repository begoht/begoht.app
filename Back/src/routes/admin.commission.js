const express = require("express");
const authAdmin = require("../middleware/authAdmin");
const {
  ensureCommissionConfig,
  updateCommissionConfig,
  MAX_RATE,
} = require("../services/commission.service");

const router = express.Router();

router.get("/commission", authAdmin, async (req, res) => {
  try {
    const config = await ensureCommissionConfig();
    res.json(config);
  } catch (err) {
    console.error("Admin commission get error:", err);
    res.status(500).json({ error: "No se pudo cargar la comision" });
  }
});

router.put("/commission", authAdmin, async (req, res) => {
  try {
    const percentage = Number(req.body?.percentage);

    if (!Number.isFinite(percentage) || percentage < 0 || percentage > MAX_RATE * 100) {
      return res.status(400).json({
        error: `La comision debe estar entre 0 y ${MAX_RATE * 100}%`,
      });
    }

    const config = await updateCommissionConfig({
      percentage,
      updatedBy: req.user?._id || null,
    });

    res.json(config);
  } catch (err) {
    console.error("Admin commission update error:", err);
    res.status(500).json({ error: "No se pudo actualizar la comision" });
  }
});

module.exports = router;
