const express = require("express");
const authAdmin = require("../middleware/authAdmin");
const {
  ensureCommissionConfig,
  updateCommissionConfig,
  MAX_RATE,
  MAX_DEBT_LIMIT,
} = require("../services/commission.service");
const { logAdminAction } = require("../services/adminAudit.service");

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
    const before = await ensureCommissionConfig();
    const percentage = Number(req.body?.percentage);
    const rawDebtLimit = req.body?.debtLimit ?? req.body?.commissionDebtLimit;
    const debtLimit = rawDebtLimit == null || rawDebtLimit === ""
      ? Number(before.debtLimit)
      : Number(rawDebtLimit);

    if (!Number.isFinite(percentage) || percentage < 0 || percentage > MAX_RATE * 100) {
      return res.status(400).json({
        error: `La comision debe estar entre 0 y ${MAX_RATE * 100}%`,
      });
    }

    if (!Number.isFinite(debtLimit) || debtLimit < 0 || debtLimit > MAX_DEBT_LIMIT) {
      return res.status(400).json({
        error: `El limite de comision pendiente debe estar entre 0 y ${MAX_DEBT_LIMIT} HTG`,
      });
    }

    const config = await updateCommissionConfig({
      percentage,
      debtLimit,
      updatedBy: req.user?._id || null,
    });

    await logAdminAction(req, {
      action: "commission.update",
      entity: "CommissionSetting",
      entityId: config._id,
      before,
      after: config,
    });

    res.json(config);
  } catch (err) {
    console.error("Admin commission update error:", err);
    res.status(500).json({ error: "No se pudo actualizar la comision" });
  }
});

module.exports = router;
