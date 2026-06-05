const express = require("express");
const authAdmin = require("../middleware/authAdmin");
const {
  ensureWalletDiscountConfig,
  updateWalletDiscountConfig,
  MAX_RATE,
} = require("../services/walletDiscount.service");
const { logAdminAction } = require("../services/adminAudit.service");

const router = express.Router();

router.get("/wallet-discount", async (req, res) => {
  try {
    const config = await ensureWalletDiscountConfig();
    res.json(config);
  } catch (err) {
    console.error("Wallet discount public get error:", err);
    res.status(500).json({ error: "No se pudo cargar el descuento wallet" });
  }
});

router.get("/admin/wallet-discount", authAdmin, async (req, res) => {
  try {
    const config = await ensureWalletDiscountConfig();
    res.json(config);
  } catch (err) {
    console.error("Admin wallet discount get error:", err);
    res.status(500).json({ error: "No se pudo cargar el descuento wallet" });
  }
});

router.put("/admin/wallet-discount", authAdmin, async (req, res) => {
  try {
    const percentage = Number(req.body?.percentage);
    const enabled = typeof req.body?.enabled === "boolean"
      ? req.body.enabled
      : String(req.body?.enabled || "").toLowerCase() === "true";

    if (!Number.isFinite(percentage) || percentage < 0 || percentage > MAX_RATE * 100) {
      return res.status(400).json({
        error: `El descuento wallet debe estar entre 0 y ${MAX_RATE * 100}%`,
      });
    }

    const before = await ensureWalletDiscountConfig();
    const config = await updateWalletDiscountConfig({
      enabled,
      percentage,
      label: req.body?.label,
      updatedBy: req.user?._id || null,
    });

    await logAdminAction(req, {
      action: "wallet_discount.update",
      entity: "WalletDiscountSetting",
      entityId: config.key,
      before,
      after: config,
    });

    res.json(config);
  } catch (err) {
    console.error("Admin wallet discount update error:", err);
    res.status(500).json({ error: "No se pudo actualizar el descuento wallet" });
  }
});

module.exports = router;
