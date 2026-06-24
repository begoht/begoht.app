const express = require("express");
const User = require("../models/User");
const authAdmin = require("../middleware/authAdmin");
const { logAdminAction } = require("../services/adminAudit.service");
const { redis } = require("../config/redis");
const {
  invalidateDriverVerification,
} = require("../services/driverVerification.service");
const {
  applyDriverAvailabilityState,
  getManualAvailabilityKey,
  isFreshDriverData,
} = require("../services/driverAvailabilityState.service");

const router = express.Router();

router.get("/usuarios", authAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -pinHash -refreshToken")
      .sort({ createdAt: -1 })
      .lean();

    res.json(await decorateRealtimeDriverStatus(users));
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
    const verified = verificado === true;
    const before = await User.findById(req.params.id)
      .select("verificado telefono nombre apellido rol")
      .lean();

    if (!before) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (before.rol !== "motorista") {
      return res.status(400).json({ error: "La verificacion solo aplica a motoristas" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          verificado: verified,
          verificadoAt: verified ? new Date() : null,
          verificadoPor: verified ? req.user._id : null,
          ...(!verified ? { disponible: false } : {}),
        },
        $inc: { tokenVersion: 1 },
        $unset: { refreshToken: "" },
      },
      { new: true }
    ).select("-password -pinHash -refreshToken");

    await invalidateDriverVerification(req.params.id);

    if (!verified) {
      const data = await redis.hgetall(`motorista:data:${req.params.id}`);
      const pipeline = redis.multi()
        .zrem("motoristas:ubicacion", req.params.id)
        .hset(`motorista:data:${req.params.id}`, {
          disponible: "false",
          online: "false",
        })
        .del(`motorista:online:${req.params.id}`);

      if (data?.city) {
        pipeline.zrem(`motoristas:ubicacion:${data.city}`, req.params.id);
      }

      await pipeline.exec();
      global.io?.to(`motorista:${req.params.id}`).emit("driver:verification-revoked", {
        code: "DRIVER_VERIFICATION_REVOKED",
        message: "La verificacion de tu cuenta fue retirada.",
      });
      global.io?.in(`motorista:${req.params.id}`).disconnectSockets(true);
    }

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
    const nextDisponible = disponible === true || disponible === "true";
    const before = await User.findById(req.params.id)
      .select("disponible online telefono nombre apellido rol")
      .lean();

    if (!before) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      nextDisponible
        ? { disponible: true }
        : { disponible: false, online: false },
      { new: true }
    ).select("-password -pinHash -refreshToken");

    if (before.rol === "motorista") {
      await applyDriverAvailabilityState(req.params.id, nextDisponible, {
        source: "admin",
      });
    }

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

async function decorateRealtimeDriverStatus(users) {
  const result = users.map((user) => ({ ...user }));
  const drivers = result.filter((user) => user.rol === "motorista");

  if (!drivers.length) return result;

  const pipe = redis.multi();
  drivers.forEach((driver) => {
    const id = driver._id.toString();
    pipe.hgetall(`motorista:data:${id}`);
    pipe.exists(`motorista:online:${id}`);
    pipe.get(getManualAvailabilityKey(id));
  });

  const replies = await pipe.exec();
  let idx = 0;

  drivers.forEach((driver) => {
    const data = replies[idx++]?.[1] || {};
    const onlineKey = Number(replies[idx++]?.[1]) === 1;
    const manualOffline = replies[idx++]?.[1] === "offline";
    const hasRedisData = Object.keys(data).length > 0;

    if (!hasRedisData && !manualOffline && !onlineKey) return;

    const redisDisponible = data.disponible === "true";
    const fresh = isFreshDriverData(data);
    driver.disponible = redisDisponible && !manualOffline;
    driver.online = onlineKey && data.online !== "false" && fresh;
  });

  return result;
}

module.exports = router;
