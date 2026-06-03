const express = require("express");
const router = express.Router();

const LaunchSetting = require("../models/LaunchSetting");
const authAdmin = require("../middleware/authAdmin");

const DEFAULT_SETTING = {
  key: "global",
  enabled: false,
  launchAt: null,
  title: "Lancement officiel BeGO",
  message: "Votre compte est pret. Le service ouvrira officiellement tres bientot.",
};

async function getSetting() {
  return LaunchSetting.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: DEFAULT_SETTING },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

function serialize(setting) {
  const launchAt = setting?.launchAt ? new Date(setting.launchAt) : null;
  const now = new Date();
  const remainingMs = launchAt ? Math.max(0, launchAt.getTime() - now.getTime()) : null;

  return {
    enabled: !!setting?.enabled,
    launchAt: launchAt ? launchAt.toISOString() : null,
    title: setting?.title || DEFAULT_SETTING.title,
    message: setting?.message || DEFAULT_SETTING.message,
    serverTime: now.toISOString(),
    remainingMs,
    phase: launchAt && launchAt.getTime() <= now.getTime() ? "launched" : "countdown",
    updatedAt: setting?.updatedAt || null,
  };
}

function cleanText(value, fallback, maxLength) {
  const text = String(value || "").trim();
  return (text || fallback).slice(0, maxLength);
}

function parseLaunchAt(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

router.get("/launch", async (req, res) => {
  try {
    const setting = await getSetting();
    res.json(serialize(setting));
  } catch (err) {
    console.error("Launch status error:", err);
    res.status(500).json({ error: "No se pudo cargar el lanzamiento" });
  }
});

router.get("/admin/launch", authAdmin, async (req, res) => {
  try {
    const setting = await getSetting();
    res.json(serialize(setting));
  } catch (err) {
    console.error("Admin launch status error:", err);
    res.status(500).json({ error: "No se pudo cargar el lanzamiento" });
  }
});

router.put("/admin/launch", authAdmin, async (req, res) => {
  try {
    const enabled = typeof req.body?.enabled === "boolean"
      ? req.body.enabled
      : String(req.body?.enabled || "").toLowerCase() === "true";
    const launchAt = parseLaunchAt(req.body?.launchAt);

    if (enabled && !launchAt) {
      return res.status(400).json({
        error: "Define una fecha valida antes de activar el contador",
      });
    }

    const setting = await LaunchSetting.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          enabled,
          launchAt,
          title: cleanText(req.body?.title, DEFAULT_SETTING.title, 80),
          message: cleanText(req.body?.message, DEFAULT_SETTING.message, 220),
          updatedBy: req.user?._id || null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json(serialize(setting));
  } catch (err) {
    console.error("Admin launch update error:", err);
    res.status(500).json({ error: "No se pudo actualizar el lanzamiento" });
  }
});

module.exports = router;
