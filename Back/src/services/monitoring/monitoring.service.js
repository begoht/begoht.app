const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const FrontendError = require("../../models/FrontendError");
const { redis } = require("../../config/redis");
const { sendMonitoringAlert } = require("./alert.service");

const SOURCE_VALUES = new Set(["passenger", "driver", "admin", "tracking", "unknown"]);
const LEVEL_VALUES = new Set(["info", "warning", "error", "critical"]);
const INTERNAL_TEST_TYPES = new Set(["monitor_smoke_test", "codex_smoke"]);
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

function monitorStatePath() {
  return process.env.MONITOR_STATE_FILE || "/var/log/bego/monitor-state.json";
}

function criticalLogPath() {
  return process.env.CRITICAL_LOG_PATH || "/var/log/bego/critical.log";
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

function socketIndividualAlertsEnabled() {
  return String(process.env.MONITOR_SOCKET_INDIVIDUAL_ALERTS || "").toLowerCase() === "true";
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

  if (socketIndividualAlertsEnabled() && ["transport close", "ping timeout", "transport error"].includes(cleanReason)) {
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

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await fs.promises.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function readLastBytes(filePath, maxBytes = 96 * 1024) {
  let handle;
  try {
    const stats = await fs.promises.stat(filePath);
    const length = Math.min(stats.size, maxBytes);
    const start = Math.max(0, stats.size - length);
    const buffer = Buffer.alloc(length);
    handle = await fs.promises.open(filePath, "r");
    await handle.read(buffer, 0, length, start);
    const text = buffer.toString("utf8");
    return start > 0 ? text.slice(text.indexOf("\n") + 1) : text;
  } catch {
    return "";
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function readCriticalAlerts(limit = 30) {
  const text = await readLastBytes(criticalLogPath());
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return {
          ts: null,
          severity: "error",
          type: "malformed_log_line",
          message: line.slice(0, 700),
        };
      }
    })
    .filter((alert) => !INTERNAL_TEST_TYPES.has(alert.type))
    .reverse();
}

async function safeResolve(promise, fallback) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function buildHealth(lastCheck, frontendErrors10m, frontendCritical10m, thresholds = {}) {
  const servicesOk = Boolean(
    lastCheck?.mongo?.ok &&
    lastCheck?.redis?.ok &&
    lastCheck?.pm2?.ok
  );

  if (!servicesOk || frontendCritical10m > 0) {
    return {
      level: "critical",
      label: "Critico",
      message: frontendCritical10m > 0
        ? `${frontendCritical10m} error critico frontend en 10 min`
        : "Un servicio de produccion requiere atencion",
    };
  }

  if (
    frontendErrors10m > 0 ||
    Number(lastCheck?.sockets?.count || 0) >= Number(thresholds.socketDisconnects || 80)
  ) {
    return {
      level: "warning",
      label: "Atencion",
      message: "Hay eventos recientes para revisar",
    };
  }

  return {
    level: "ok",
    label: "Estable",
    message: "PM2, Mongo, Redis y Socket.IO responden",
  };
}

async function getMonitoringSnapshot() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const realFrontendMatch = {
    type: { $nin: [...INTERNAL_TEST_TYPES] },
    createdAt: { $gte: tenMinutesAgo },
  };
  const [
    recentFrontendErrors,
    frontendErrors10m,
    frontendCritical10m,
    frontendByLevel,
    frontendBySource,
    socketDisconnects,
    monitorState,
    criticalAlerts,
  ] = await Promise.all([
    safeResolve(FrontendError.find({ type: { $nin: [...INTERNAL_TEST_TYPES] } }).sort({ createdAt: -1 }).limit(40).lean(), []),
    safeResolve(FrontendError.countDocuments({ ...realFrontendMatch, level: { $in: ["error", "critical"] } }), 0),
    safeResolve(FrontendError.countDocuments({ ...realFrontendMatch, level: "critical" }), 0),
    safeResolve(FrontendError.aggregate([
      { $match: realFrontendMatch },
      { $group: { _id: "$level", total: { $sum: 1 } } },
    ]), []),
    safeResolve(FrontendError.aggregate([
      { $match: realFrontendMatch },
      { $group: { _id: "$source", total: { $sum: 1 } } },
    ]), []),
    safeResolve(sumCounterWindow("monitor:socket:disconnects", 10), null),
    readJsonFile(monitorStatePath()),
    readCriticalAlerts(30),
  ]);
  const lastCheck = monitorState?.lastCheck || null;
  const socketCount = Number(socketDisconnects ?? lastCheck?.sockets?.count ?? 0);
  const thresholds = {
    socketDisconnects: Number(process.env.MONITOR_SOCKET_DISCONNECT_THRESHOLD || 80),
    frontendErrors: Number(process.env.MONITOR_FRONTEND_ERROR_THRESHOLD || 12),
    pm2Restarts: Number(process.env.MONITOR_PM2_RESTART_THRESHOLD || 3),
  };

  return {
    ok: true,
    health: buildHealth(lastCheck, frontendErrors10m, frontendCritical10m, thresholds),
    monitorState: {
      lastCheck,
      stateFile: path.basename(monitorStatePath()),
    },
    frontendErrors10m,
    frontendCritical10m,
    frontendByLevel,
    frontendBySource,
    socketDisconnects: socketCount,
    criticalAlerts,
    thresholds,
    recentFrontendErrors,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getMonitoringSnapshot,
  recordFrontendError,
  recordSocketDisconnect,
};
