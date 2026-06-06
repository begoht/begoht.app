const express = require("express");
const rateLimit = require("express-rate-limit");
const authAdmin = require("../middleware/authAdmin");
const {
  getMonitoringSnapshot,
  recordFrontendError,
} = require("../services/monitoring/monitoring.service");

const router = express.Router();

const frontendErrorLimiter = rateLimit({
  windowMs: Number(process.env.FRONTEND_ERROR_RATE_WINDOW_MS || 60_000),
  limit: Number(process.env.FRONTEND_ERROR_RATE_LIMIT || 40),
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/frontend-error", frontendErrorLimiter, async (req, res) => {
  try {
    await recordFrontendError(req.body || {}, req);
    res.status(202).json({ ok: true });
  } catch (err) {
    console.error("Error capturando frontend-error:", err.message);
    res.status(202).json({ ok: false });
  }
});

router.get("/status", authAdmin, async (req, res) => {
  try {
    res.json(await getMonitoringSnapshot());
  } catch (err) {
    console.error("Error monitor status:", err);
    res.status(500).json({ error: "Error monitor status" });
  }
});

module.exports = router;
