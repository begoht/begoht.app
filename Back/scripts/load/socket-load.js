#!/usr/bin/env node

const fs = require("fs");
const { io } = require("socket.io-client");

const args = parseArgs(process.argv.slice(2));

const url = args.url || process.env.LOAD_SOCKET_URL || "http://127.0.0.1:3000";
const clientsTarget = positiveInt(args.clients || args.c || process.env.LOAD_SOCKET_CLIENTS, 500);
const batchSize = positiveInt(args.batch || process.env.LOAD_SOCKET_BATCH, 50);
const batchDelayMs = positiveInt(args.batchDelay || process.env.LOAD_SOCKET_BATCH_DELAY_MS, 250);
const durationMs = positiveInt(args.duration || process.env.LOAD_SOCKET_DURATION_MS, 120000);
const emitIntervalMs = positiveInt(args.emitInterval || process.env.LOAD_SOCKET_EMIT_INTERVAL_MS, 4000);
const mode = args.mode || process.env.LOAD_SOCKET_MODE || "tracking";
const joinToken = args.joinToken || process.env.LOAD_TRACKING_TOKEN || "";
const tokens = loadTokens(args.tokens || process.env.LOAD_SOCKET_TOKENS);

if (mode !== "tracking" && tokens.length < clientsTarget) {
  console.error(
    `Mode ${mode} needs ${clientsTarget} unique JWT tokens. ` +
    `Provide them with --tokens path/to/tokens.txt`
  );
  process.exit(1);
}

const startedAt = Date.now();
const sockets = [];
const timers = [];
const connectTimes = [];
const metrics = {
  started: 0,
  connected: 0,
  disconnected: 0,
  connectErrors: 0,
  locationsSent: 0,
  trackJoins: 0
};

console.log(JSON.stringify({
  event: "load_start",
  url,
  clients: clientsTarget,
  mode,
  batchSize,
  batchDelayMs,
  durationMs,
  emitIntervalMs
}));

const statusTimer = setInterval(reportStatus, 5000);
timers.push(statusTimer);

rampClients()
  .then(() => wait(durationMs))
  .then(shutdown)
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
    shutdown();
  });

async function rampClients() {
  for (let index = 0; index < clientsTarget; index += batchSize) {
    const end = Math.min(index + batchSize, clientsTarget);
    for (let i = index; i < end; i += 1) connectClient(i);
    await wait(batchDelayMs);
  }
}

function connectClient(index) {
  const connectStartedAt = Date.now();
  metrics.started += 1;

  const socket = io(url, {
    auth: authFor(index),
    transports: ["websocket"],
    reconnection: false,
    timeout: 10000,
    forceNew: true
  });

  sockets.push(socket);

  socket.on("connect", () => {
    metrics.connected += 1;
    connectTimes.push(Date.now() - connectStartedAt);

    if (mode === "tracking" && joinToken) {
      socket.emit("track:join", { token: joinToken }, () => {
        metrics.trackJoins += 1;
      });
    }

    if (mode === "driver") {
      startLocationEmitter(socket, index);
    }
  });

  socket.on("connect_error", () => {
    metrics.connectErrors += 1;
  });

  socket.on("disconnect", () => {
    metrics.disconnected += 1;
  });
}

function authFor(index) {
  if (mode === "tracking") return { tracking: true };
  return { token: tokens[index], role: "motorista" };
}

function startLocationEmitter(socket, index) {
  const baseLat = Number(args.lat || process.env.LOAD_SOCKET_LAT || 18.5392);
  const baseLng = Number(args.lng || process.env.LOAD_SOCKET_LNG || -72.3364);

  const timer = setInterval(() => {
    if (!socket.connected) return;
    const offset = (index % 100) * 0.00001;
    socket.emit("motoristas:ubicacion", {
      lat: baseLat + offset,
      lng: baseLng - offset,
      disponible: true
    });
    metrics.locationsSent += 1;
  }, emitIntervalMs);

  timers.push(timer);
}

function reportStatus() {
  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(JSON.stringify({
    event: "load_status",
    elapsedSeconds,
    ...metrics,
    active: sockets.filter((socket) => socket.connected).length,
    connectP95Ms: percentile(connectTimes, 95)
  }));
}

function shutdown() {
  timers.forEach(clearInterval);
  sockets.forEach((socket) => socket.disconnect());
  reportStatus();
  console.log(JSON.stringify({
    event: "load_done",
    ...metrics,
    active: sockets.filter((socket) => socket.connected).length,
    connectP50Ms: percentile(connectTimes, 50),
    connectP95Ms: percentile(connectTimes, 95),
    connectP99Ms: percentile(connectTimes, 99)
  }));
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    parsed[key] = next && !next.startsWith("--") ? next : true;
    if (parsed[key] === next) i += 1;
  }
  return parsed;
}

function loadTokens(filePath) {
  if (!filePath) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1);
  return sorted[index];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
