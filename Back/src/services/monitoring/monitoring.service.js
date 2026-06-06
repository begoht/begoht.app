const mongoose = require("mongoose");
const FrontendError = require("../../models/FrontendError");
const { redis } = require("../../config/redis");
const { sendMonitoringAlert } = require("./alert.service");

const SOURCE_VALUES = new Set(["passenger", "driver", "admin", "tracking", "unknown"]);
const LEVEL_VALUES = new Set(["info", "warning", "error", "critical"]);
const BUCKET_MS = 60 * 1000;

function redisTimeoutMs() {
  return Number(process.env.MONITOR_REDIS_TIMEOUT_MS || 1500);
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function bucketNow(date = new Date()) {
  return Math.floor(date.getTime() / BUCKET_MS) * BUCKET_MS;
}

function safeString(value, max = 700) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeSource(value) {
  const source = safeString(value, 40);
  return SOURCE_VALUES.has(source) ? source : "unknown";
}

function safeLevel(value) {
  const level = safeString(value, 40);
  return LEVEL_VALUES.has(level) ? level : "error";
}

function objectIdOrNull(value) {
  return mongoose.Types.ObjectId.isValid(value) ? value : null;
}

async function incrementCounter(key, expireSeconds = 3600) {
  const timeoutMs = redisTimeoutMs();
  const count = await withTimeout(redis.incr(key), timeoutMs, `redis incr ${key}`);
  if (count === 1) await withTimeout(redis.expire(key, expireSeconds), timeoutMs, `redis expire ${key}`);
  return count;
}

async function recordSocketDisconnect({ role, reason, userId, socketId } = {}) {
  const nowBucket = bucketNow();
  const cleanReason = safeString(reason || "unknown", 120);
  const cleanRole = safeString(role || "unknown", 40);

  try {
    await Promise.all([
      incrementCounter(`monitor:socket:disconnects:${nowBucket}`),
      incrementCounter(`monitor:socket:disconnects:${nowBucket}:${cleanRole}`),
      incrementCounter(`monitor:socket:disconnects:${nowBucket}:reason:${cleanReason}`),
    ]);
  } catch (err) {
    console.warn("Monitor socket counter failed:", err.message);
  }

  if (["transport close", "ping timeout", "transport error"].includes(cleanReason)) {
    await sendMonitoringAlert({
      type: "socket_disconnect",
      severity: "warning",
      title: "Socket desconectado en BeGO",
      message: `${cleanRole} desconectado: ${cleanReason}`,
      meta: { role: cleanRole, reason: cleanReason, userId: safeString(userId, 80), socketId: safeString(socketId, 80) },
      dedupeKey: `socket_disconnect:${cleanRole}:${cleanReason}`,
      dedupeSeconds: Number(process.env.MONITOR_SOCKET_ALERT_DEDUP_SECONDS || 900),
    });
  }
}

async function recordFrontendError(payload = {}, req = {}) {
  const level = safeLevel(payload.level);
  const source = safeSource(payload.source);
  const nowBucket = bucketNow();

  const doc = await FrontendError.create({
    source,
    level,
    type: safeString(payload.type || "frontend_error", 80),
    message: safeString(payload.message, 700),
    stack: safeString(payload.stack, 4000),
    url: safeString(payload.url, 900),
    route: safeString(payload.route, 180),
    release: safeString(payload.release, 80),
    userAgent: safeString(payload.userAgent || req.headers?.["user-agent"], 700),
    platform: safeString(payload.platform, 80),
    viewport: {
      width: Number(payload.viewport?.width || 0),
      height: Number(payload.viewport?.height || 0),
      dpr: Number(payload.viewport?.dpr || 1),
    },
    online: payload.online !== false,
    ip: safeString(req.ip || req.headers?.["x-forwarded-for"] || "", 80),
    userId: objectIdOrNull(payload.userId),
    raw: {
      connection: payload.connection || null,
      app: payload.app || null,
    },
  });

  try {
    await Promise.all([
      incrementCounter(`monitor:frontend:${level}:${nowBucket}`),
      incrementCounter(`monitor:frontend:${source}:${level}:${nowBucket}`),
    ]);
  } catch (err) {
    console.warn("Monitor frontend counter failed:", err.message);
  }

  if (level === "critical") {
    await sendMonitoringAlert({
      type: "frontend_critical",
      severity: "critical",
      title: "Error crítico frontend BeGO",
      message: doc.message || "Error crítico capturado en celular",
      meta: {
        source,
        url: doc.url,
        route: doc.route,
        userAgent: doc.userAgent,
        errorId: doc._id.toString(),
      },
      dedupeKey: `frontend_critical:${source}:${safeString(doc.message, 180)}`,
      dedupeSeconds: Number(process.env.MONITOR_FRONTEND_ALERT_DEDUP_SECONDS || 900),
    });
  }

  return doc;
}

async function sumCounterWindow(prefix, minutes = 10) {
  const now = Date.now();
  const keys = [];
  for (let index = 0; index < minutes; index += 1) {
    const bucket = Math.floor((now - index * BUCKET_MS) / BUCKET_MS) * BUCKET_MS;
    keys.push(`${prefix}:${bucket}`);
  }

  const values = await withTimeout(redis.mget(keys), redisTimeoutMs(), `redis mget ${prefix}`);
  return values.reduce((acc, value) => acc + Number(value || 0), 0);
}

async function getMonitoringSnapshot() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const [recentFrontendErrors, frontendErrors10m, socketDisconnects] = await Promise.all([
    FrontendError.find().sort({ createdAt: -1 }).limit(40).lean(),
    FrontendError.countDocuments({ level: { $in: ["error", "critical"] }, createdAt: { $gte: tenMinutesAgo } }),
    sumCounterWindow("monitor:socket:disconnects", 10),
  ]);

  return {
    ok: true,
    frontendErrors10m,
    socketDisconnects,
    recentFrontendErrors,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getMonitoringSnapshot,
  recordFrontendError,
  recordSocketDisconnect,
};
