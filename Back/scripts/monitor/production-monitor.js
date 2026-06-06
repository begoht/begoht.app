require("dotenv").config();

const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { redis } = require("../../src/config/redis");
const { sendMonitoringAlert } = require("../../src/services/monitoring/alert.service");

const CHECK_INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS || 60_000);
const PM2_RESTART_THRESHOLD = Number(process.env.MONITOR_PM2_RESTART_THRESHOLD || 3);
const PM2_BAD_STATUS_CHECKS = Number(process.env.MONITOR_PM2_BAD_STATUS_CHECKS || 2);
const SOCKET_DISCONNECT_THRESHOLD = Number(process.env.MONITOR_SOCKET_DISCONNECT_THRESHOLD || 80);
const FRONTEND_ERROR_THRESHOLD = Number(process.env.MONITOR_FRONTEND_ERROR_THRESHOLD || 12);
const WINDOW_MINUTES = Number(process.env.MONITOR_WINDOW_MINUTES || 5);
const STATE_FILE = process.env.MONITOR_STATE_FILE || "/var/log/bego/monitor-state.json";
const RUN_ONCE = String(process.env.MONITOR_RUN_ONCE || "").toLowerCase() === "true";

let running = false;
let lastRedisConnectionLogAt = 0;

redis.removeAllListeners("error");
redis.on("error", (error) => {
  const now = Date.now();
  if (now - lastRedisConnectionLogAt < 60_000) return;
  lastRedisConnectionLogAt = now;
  console.warn("Redis monitor error:", error.message);
});

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

function execJson(command, args = [], timeout = 7000) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        parseError.stdout = stdout;
        reject(parseError);
      }
    });
  });
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    const fallback = path.resolve(__dirname, "../../logs/monitor-state.json");
    fs.mkdirSync(path.dirname(fallback), { recursive: true });
    fs.writeFileSync(fallback, JSON.stringify(state, null, 2));
  }
}

async function checkMongo() {
  if (mongoose.connection.readyState === 1) return { ok: true, state: 1 };

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: Number(process.env.MONITOR_MONGO_TIMEOUT_MS || 2500),
    });
    return { ok: true, state: mongoose.connection.readyState };
  } catch (error) {
    await sendMonitoringAlert({
      type: "mongo_down",
      severity: "critical",
      title: "MongoDB no responde",
      message: error.message,
      meta: { state: mongoose.connection.readyState },
      dedupeKey: "mongo_down",
      dedupeSeconds: 600,
    });
    return { ok: false, error: error.message, state: mongoose.connection.readyState };
  }
}

async function checkRedis() {
  try {
    const pong = await withTimeout(redis.ping(), redisTimeoutMs(), "redis ping");
    return { ok: pong === "PONG" };
  } catch (error) {
    await sendMonitoringAlert({
      type: "redis_down",
      severity: "critical",
      title: "Redis no responde",
      message: error.message,
      dedupeKey: "redis_down",
      dedupeSeconds: 600,
    });
    return { ok: false, error: error.message };
  }
}

async function checkPm2Restarts(state) {
  let apps;
  try {
    apps = await execJson(process.env.PM2_BIN || "pm2", ["jlist"]);
  } catch (error) {
    await sendMonitoringAlert({
      type: "pm2_check_failed",
      severity: "error",
      title: "No se pudo consultar PM2",
      message: error.message,
      dedupeKey: "pm2_check_failed",
      dedupeSeconds: 900,
    });
    return { ok: false, error: error.message };
  }

  const watched = String(process.env.MONITOR_PM2_APPS || "bego-api,bego-monitor")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const result = {};
  const seen = new Set();

  for (const app of apps.filter((item) => watched.includes(item.name))) {
    seen.add(app.name);
    const restarts = Number(app.pm2_env?.restart_time || 0);
    const status = app.pm2_env?.status || "unknown";
    const previousState = state.pm2?.[app.name] || {};
    const previous = Number(previousState.restarts ?? restarts);
    const delta = Math.max(0, restarts - previous);
    const badStatusCount = status === "online" ? 0 : Number(previousState.badStatusCount || 0) + 1;
    result[app.name] = { status, restarts, delta, badStatusCount };

    if (status !== "online" && badStatusCount >= PM2_BAD_STATUS_CHECKS) {
      await sendMonitoringAlert({
        type: "pm2_app_not_online",
        severity: "critical",
        title: `${app.name} no esta online`,
        message: `Estado PM2: ${status}`,
        meta: { app: app.name, status, restarts, badStatusCount },
        dedupeKey: `pm2_app_not_online:${app.name}`,
        dedupeSeconds: 300,
      });
    }

    if (delta >= PM2_RESTART_THRESHOLD) {
      await sendMonitoringAlert({
        type: "pm2_restart_spike",
        severity: "critical",
        title: `${app.name} esta reiniciando mucho`,
        message: `${delta} reinicios desde el ultimo chequeo`,
        meta: { app: app.name, restarts, delta, threshold: PM2_RESTART_THRESHOLD },
        dedupeKey: `pm2_restart_spike:${app.name}`,
        dedupeSeconds: 900,
      });
    }

    state.pm2 = state.pm2 || {};
    state.pm2[app.name] = { restarts, badStatusCount, checkedAt: new Date().toISOString() };
  }

  for (const appName of watched) {
    if (seen.has(appName)) continue;

    const previousState = state.pm2?.[appName] || {};
    const badStatusCount = Number(previousState.badStatusCount || 0) + 1;
    result[appName] = { status: "missing", restarts: 0, delta: 0, badStatusCount };

    if (badStatusCount >= PM2_BAD_STATUS_CHECKS) {
      await sendMonitoringAlert({
        type: "pm2_app_missing",
        severity: "critical",
        title: `${appName} no existe en PM2`,
        message: `No se encontro ${appName} en pm2 jlist`,
        meta: { app: appName, watched, badStatusCount },
        dedupeKey: `pm2_app_missing:${appName}`,
        dedupeSeconds: 300,
      });
    }

    state.pm2 = state.pm2 || {};
    state.pm2[appName] = { restarts: Number(previousState.restarts || 0), badStatusCount, checkedAt: new Date().toISOString() };
  }

  return { ok: true, apps: result };
}

async function sumCounterWindow(prefix) {
  const now = Date.now();
  const buckets = [];
  for (let index = 0; index < WINDOW_MINUTES; index += 1) {
    buckets.push(Math.floor((now - index * 60_000) / 60_000) * 60_000);
  }

  const keys = buckets.map((bucket) => `${prefix}:${bucket}`);
  const values = await withTimeout(redis.mget(keys), redisTimeoutMs(), `redis mget ${prefix}`);
  return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

async function checkSocketDisconnects() {
  try {
    const count = await sumCounterWindow("monitor:socket:disconnects");
    if (count >= SOCKET_DISCONNECT_THRESHOLD) {
      await sendMonitoringAlert({
        type: "socket_disconnect_spike",
        severity: "warning",
        title: "Muchas desconexiones Socket.IO",
        message: `${count} desconexiones en ${WINDOW_MINUTES} minutos`,
        meta: { count, windowMinutes: WINDOW_MINUTES, threshold: SOCKET_DISCONNECT_THRESHOLD },
        dedupeKey: "socket_disconnect_spike",
        dedupeSeconds: 600,
      });
    }
    return { ok: true, count };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function checkFrontendErrors() {
  try {
    const count = await sumCounterWindow("monitor:frontend:error");
    const critical = await sumCounterWindow("monitor:frontend:critical");
    const total = count + critical;
    if (total >= FRONTEND_ERROR_THRESHOLD || critical > 0) {
      await sendMonitoringAlert({
        type: "frontend_error_spike",
        severity: critical > 0 ? "critical" : "warning",
        title: "Errores frontend desde celulares",
        message: `${total} errores frontend en ${WINDOW_MINUTES} minutos`,
        meta: { errors: count, critical, windowMinutes: WINDOW_MINUTES, threshold: FRONTEND_ERROR_THRESHOLD },
        dedupeKey: "frontend_error_spike",
        dedupeSeconds: 600,
      });
    }
    return { ok: true, errors: count, critical };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function runCheck() {
  if (running) return;
  running = true;
  const state = readState();

  try {
    const [mongo, redisStatus, pm2, sockets, frontend] = await Promise.all([
      checkMongo(),
      checkRedis(),
      checkPm2Restarts(state),
      checkSocketDisconnects(),
      checkFrontendErrors(),
    ]);

    state.lastCheck = {
      at: new Date().toISOString(),
      mongo,
      redis: redisStatus,
      pm2,
      sockets,
      frontend,
    };
    writeState(state);
    console.log("monitor ok", JSON.stringify(state.lastCheck));
  } catch (error) {
    await sendMonitoringAlert({
      type: "monitor_loop_failed",
      severity: "critical",
      title: "Monitor BeGO fallo",
      message: error.message,
      dedupeKey: "monitor_loop_failed",
      dedupeSeconds: 600,
    });
  } finally {
    running = false;
  }
}

async function shutdown(code = 0) {
  await mongoose.disconnect().catch(() => {});
  redis.disconnect();
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function start() {
  await runCheck();
  if (RUN_ONCE) await shutdown(0);
  setInterval(runCheck, CHECK_INTERVAL_MS);
}

start();
