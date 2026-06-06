const express = require("express");
const authAdmin = require("../middleware/authAdmin");
const {
  METHOD_IDS,
  ensurePaymentMethodSettings,
  updatePaymentMethodSettings,
} = require("../services/paymentMethodSettings.service");
const { logAdminAction } = require("../services/adminAudit.service");

const router = express.Router();

router.get("/payment-method-settings", async (req, res) => {
  try {
    const config = await ensurePaymentMethodSettings();
    res.json(config);
  } catch (err) {
    console.error("Payment method settings public get error:", err);
    res.status(500).json({ error: "No se pudo cargar metodos de pago" });
  }
});

router.get("/admin/payment-methods", authAdmin, async (req, res) => {
  try {
    const config = await ensurePaymentMethodSettings();
    res.json(config);
  } catch (err) {
    console.error("Admin payment methods get error:", err);
    res.status(500).json({ error: "No se pudo cargar metodos de pago" });
  }
});

router.put("/admin/payment-methods", authAdmin, async (req, res) => {
  try {
    const incoming = req.body?.methods || {};
    const methods = {};

    for (const id of METHOD_IDS) {
      const method = incoming[id] || {};
      methods[id] = {
        enabled: typeof method.enabled === "boolean"
          ? method.enabled
          : String(method.enabled || "").toLowerCase() === "true",
        label: method.label,
        unavailableMessage: method.unavailableMessage,
      };
    }

    const before = await ensurePaymentMethodSettings();
    const config = await updatePaymentMethodSettings({
      methods,
      updatedBy: req.user?._id || null,
    });

    await logAdminAction(req, {
      action: "payment_methods.update",
      entity: "PaymentMethodSetting",
      entityId: config.key,
      before,
      after: config,
    });

    res.json(config);
  } catch (err) {
    console.error("Admin payment methods update error:", err);
    res.status(500).json({ error: "No se pudo actualizar metodos de pago" });
  }
});

module.exports = router;
