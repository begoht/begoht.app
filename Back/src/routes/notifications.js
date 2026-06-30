const express = require("express");
const authHttp = require("../middleware/authHttp");
const authAdmin = require("../middleware/authAdmin");
const AppNotification = require("../models/AppNotification");
const { logAdminAction } = require("../services/adminAudit.service");
const {
  registerPushDevice,
  unregisterPushDevice,
  sendNewsPush,
} = require("../services/pushNotification.service");

const router = express.Router();

router.post("/notifications/devices", authHttp, async (req, res) => {
  try {
    if (!["pasajero", "motorista"].includes(req.user.rol)) {
      return res.status(403).json({ error: "Rol no habilitado para notificaciones" });
    }
    await registerPushDevice({
      userId: req.user.id,
      role: req.user.rol,
      token: req.body?.token,
      app: req.user.rol === "motorista" ? "driver" : "passenger",
      platform: req.body?.platform,
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "No se pudo registrar el dispositivo" });
  }
});

router.delete("/notifications/devices", authHttp, async (req, res) => {
  await unregisterPushDevice({ userId: req.user.id, token: req.body?.token });
  return res.json({ ok: true });
});

router.get("/notifications/news", authHttp, async (req, res) => {
  const audience = req.user.rol === "motorista" ? "motoristas" : "pasajeros";
  const notifications = await AppNotification.find({
    active: true,
    audience: { $in: [audience, "todos"] },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("title message audience createdAt")
    .lean();
  return res.json(notifications);
});

router.get("/admin/notifications", authAdmin, async (_req, res) => {
  const notifications = await AppNotification.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("createdBy", "nombre alias")
    .lean();
  return res.json(notifications);
});

router.post("/admin/notifications", authAdmin, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const message = String(req.body?.message || "").trim();
  const audience = String(req.body?.audience || "").trim();

  if (!title || !message) {
    return res.status(400).json({ error: "Titulo y mensaje son obligatorios" });
  }
  if (title.length > 80 || message.length > 500) {
    return res.status(400).json({ error: "El titulo o mensaje supera el limite permitido" });
  }
  if (!["pasajeros", "motoristas", "todos"].includes(audience)) {
    return res.status(400).json({ error: "Destinatario invalido" });
  }

  try {
    const notification = await AppNotification.create({
      title,
      message,
      audience,
      createdBy: req.user.id,
    });
    const payload = {
      id: notification._id.toString(),
      title,
      message,
      audience,
      createdAt: notification.createdAt,
    };
    const rooms = audience === "todos"
      ? ["rol:pasajero", "rol:motorista"]
      : [audience === "motoristas" ? "rol:motorista" : "rol:pasajero"];
    rooms.forEach((room) => global.io?.to(room).emit("noticia:nueva", payload));

    const delivery = await sendNewsPush({
      audience,
      title,
      message,
      notificationId: notification._id,
    }).catch((error) => ({
      devices: 0,
      sent: 0,
      failed: 0,
      pushAvailable: false,
      error: error.message,
    }));

    notification.delivery = delivery;
    await notification.save();
    await logAdminAction(req, {
      action: "notification.broadcast",
      entity: "AppNotification",
      entityId: notification._id,
      after: { title, message, audience, delivery },
    });

    return res.status(201).json({ ...payload, delivery });
  } catch (error) {
    console.error("Error enviando noticia general:", error);
    return res.status(500).json({ error: "No se pudo enviar la noticia" });
  }
});

module.exports = router;
