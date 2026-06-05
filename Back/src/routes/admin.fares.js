const express = require("express");
const authAdmin = require("../middleware/authAdmin");
const {
  ensureFareConfig,
  updateFareConfig,
  MAX_AMOUNT,
} = require("../services/fareConfig.service");
const { logAdminAction } = require("../services/adminAudit.service");

const router = express.Router();

router.get("/fares", authAdmin, async (req, res) => {
  try {
    const config = await ensureFareConfig();
    res.json(config);
  } catch (err) {
    console.error("Admin fares get error:", err);
    res.status(500).json({ error: "No se pudo cargar la tarifa base" });
  }
});

router.put("/fares", authAdmin, async (req, res) => {
  try {
    const baseFare = Number(req.body?.baseFare);
    const pricePerKm = Number(req.body?.pricePerKm);

    if (!Number.isFinite(baseFare) || baseFare < 0 || baseFare > MAX_AMOUNT) {
      return res.status(400).json({
        error: `La tarifa base debe estar entre 0 y ${MAX_AMOUNT} HTG`,
      });
    }

    if (!Number.isFinite(pricePerKm) || pricePerKm < 0 || pricePerKm > MAX_AMOUNT) {
      return res.status(400).json({
        error: `El precio por kilometro debe estar entre 0 y ${MAX_AMOUNT} HTG`,
      });
    }

    const before = await ensureFareConfig();
    const config = await updateFareConfig({
      baseFare,
      pricePerKm,
      updatedBy: req.user?._id || null,
    });

    await logAdminAction(req, {
      action: "fare_config.update",
      entity: "FareSetting",
      entityId: config.key,
      before,
      after: config,
    });

    res.json(config);
  } catch (err) {
    console.error("Admin fares update error:", err);
    res.status(500).json({ error: "No se pudo actualizar la tarifa base" });
  }
});

module.exports = router;
