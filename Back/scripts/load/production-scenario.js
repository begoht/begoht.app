#!/usr/bin/env node

const fs = require("fs");
const { io } = require("socket.io-client");

const args = parseArgs(process.argv.slice(2));
const url = args.url || process.env.LOAD_SOCKET_URL || "https://bego.com.ht";
const fixturePath = args.fixtures || process.env.LOAD_FIXTURES;
const clientsTarget = positiveInt(args.clients || process.env.LOAD_SOCKET_CLIENTS, 500);
const passengerTrips = positiveInt(args.trips || process.env.LOAD_TRIPS, Math.max(1, Math.floor(clientsTarget * 0.1)));
const batchSize = positiveInt(args.batch || process.env.LOAD_SOCKET_BATCH, 50);
const batchDelayMs = positiveInt(args.batchDelay || process.env.LOAD_SOCKET_BATCH_DELAY_MS, 250);
const durationMs = positiveInt(args.duration || process.env.LOAD_SOCKET_DURATION_MS, 120000);
const connectTimeoutMs = positiveInt(args.connectTimeout || process.env.LOAD_CONNECT_TIMEOUT_MS, 30000);
const emitMinMs = positiveInt(args.emitMin || process.env.LOAD_LOCATION_EMIT_MIN_MS, 3000);
const emitMaxMs = positiveInt(args.emitMax || process.env.LOAD_LOCATION_EMIT_MAX_MS, 5000);
const reportEveryMs = positiveInt(args.reportEvery || process.env.LOAD_REPORT_EVERY_MS, 5000);
const city = args.city || process.env.LOAD_CITY || "jacmel";
const baseLat = Number(args.lat || process.env.LOAD_LAT || 18.2395);
const baseLng = Number(args.lng || process.env.LOAD_LNG || -72.5373);
const destLat = Number(args.destLat || process.env.LOAD_DEST_LAT || 18.2442);
const destLng = Number(args.destLng || process.env.LOAD_DEST_LNG || -72.5294);

if (!fixturePath) {
  console.error("Falta --fixtures path/to/load-fixtures.json");
  process.exit(1);
}

const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const passengerCount = Math.min(passengerTrips, fixtures.passengers.length);
const driverCount = Math.min(clientsTarget - passengerCount, fixtures.drivers.length);

if (driverCount + passengerCount < clientsTarget) {
  console.error(`Fixtures insuficientes: ${driverCount + passengerCount}/${clientsTarget}`);
  process.exit(1);
}

const startedAt = Date.now();
const sockets = [];
const timers = [];
const connectTimes = [];
const tripLatencies = [];
const locationIntervals = [];
const metrics = {
  started: 0,
  connected: 0,
  disconnected: 0,
  connectErrors: 0,
  driversConnected: 0,
  passengersConnected: 0,
  locationsSent: 0,
  tripsRequested: 0,
  tripsSearching: 0,
  tripErrors: 0,
  activeTripErrors: 0,
  offersReceived: 0,
  walletUpdates: 0,
  connectErrorReasons: {},
};

console.log(JSON.stringify({
  event: "load_start",
  runId: fixtures.runId,
  url,
  clients: clientsTarget,
  drivers: driverCount,
  passengerTrips: passengerCount,
  batchSize,
  batchDelayMs,
  durationMs,
  emitMinMs,
  emitMaxMs,
  connectTimeoutMs,
  city,
}));

const statusTimer = setInterval(reportStatus, reportEveryMs);
timers.push(statusTimer);

rampClients()
  .then(() => wait(durationMs))
  .then(() => shutdown(0))
  .catch((error) => {
    console.error(error);
    shutdown(1);
  });

async function rampClients() {
  const work = [];
  let driverIndex = 0;
  let passengerIndex = 0;
  const passengerEvery = passengerCount > 0
    ? Math.max(1, Math.floor(clientsTarget / passengerCount))
    : Number.POSITIVE_INFINITY;

  for (let slot = 0; slot < clientsTarget; slot += 1) {
    const shouldPlacePassenger =
      passengerIndex < passengerCount &&
      (slot % passengerEvery === 0 || driverIndex >= driverCount);

    if (shouldPlacePassenger) {
      work.push({ type: "passenger", index: passengerIndex });
      passengerIndex += 1;
    } else if (driverIndex < driverCount) {
      work.push({ type: "driver", index: driverIndex });
      driverIndex += 1;
    } else if (passengerIndex < passengerCount) {
      work.push({ type: "passenger", index: passengerIndex });
      passengerIndex += 1;
    }
  }

  for (let index = 0; index < work.length; index += batchSize) {
    const end = Math.min(index + batchSize, work.length);
    for (let cursor = index; cursor < end; cursor += 1) {
      const item = work[cursor];
      if (item.type === "driver") connectDriver(item.index);
      else connectPassenger(item.index);
    }
    await wait(batchDelayMs);
  }
}

function connectDriver(index) {
  const entry = fixtures.drivers[index];
  const socket = connectSocket(entry.token, "motorista");
  const connectStartedAt = Date.now();
  metrics.started += 1;
  sockets.push(socket);

  socket.on("connect", () => {
    metrics.connected += 1;
    metrics.driversConnected += 1;
    connectTimes.push(Date.now() - connectStartedAt);
    startLocationEmitter(socket, index);
  });

  socket.on("viaje:oferta", () => {
    metrics.offersReceived += 1;
  });

  socket.on("wallet:update", () => {
    metrics.walletUpdates += 1;
  });

  attachCommon(socket);
}

function connectPassenger(index) {
  const entry = fixtures.passengers[index];
  const socket = connectSocket(entry.token, "pasajero");
  const connectStartedAt = Date.now();
  metrics.started += 1;
  sockets.push(socket);

  socket.on("connect", () => {
    metrics.connected += 1;
    metrics.passengersConnected += 1;
    connectTimes.push(Date.now() - connectStartedAt);
    const timer = setTimeout(() => requestTrip(socket, index), 500 + (index % 20) * 120);
    timers.push(timer);
  });

  socket.on("viaje-buscando", () => {
    metrics.tripsSearching += 1;
    if (socket.__tripRequestedAt) {
      tripLatencies.push(Date.now() - socket.__tripRequestedAt);
    }
  });

  socket.on("viaje-error", () => {
    metrics.tripErrors += 1;
  });

  socket.on("error-viaje-activo", () => {
    metrics.activeTripErrors += 1;
  });

  socket.on("wallet:update", () => {
    metrics.walletUpdates += 1;
  });

  attachCommon(socket);
}

function connectSocket(token, role) {
  return io(url, {
    auth: { token, role },
    transports: ["websocket"],
    reconnection: false,
    timeout: connectTimeoutMs,
    forceNew: true,
  });
}

function attachCommon(socket) {
  socket.on("connect_error", (error) => {
    metrics.connectErrors += 1;
    const reason = String(error?.message || "unknown").slice(0, 80);
    metrics.connectErrorReasons[reason] = (metrics.connectErrorReasons[reason] || 0) + 1;
  });

  socket.on("disconnect", () => {
    metrics.disconnected += 1;
  });
}

function startLocationEmitter(socket, index) {
  function tick() {
    if (!socket.connected) return;
    const point = jitterPoint(index);
    socket.emit("motoristas:ubicacion", {
      lat: point.lat,
      lng: point.lng,
      heading: (index * 13) % 360,
      disponible: true,
    });
    metrics.locationsSent += 1;
    const next = randomInt(emitMinMs, emitMaxMs);
    locationIntervals.push(next);
    const timer = setTimeout(tick, next);
    timers.push(timer);
  }

  const timer = setTimeout(tick, randomInt(250, 1500));
  timers.push(timer);
}

function requestTrip(socket, index) {
  if (!socket.connected || socket.__tripRequestedAt) return;
  const origin = jitterPoint(index);
  socket.__tripRequestedAt = Date.now();
  metrics.tripsRequested += 1;
  socket.emit("confirmar-viaje", {
    origen: {
      lat: origin.lat,
      lng: origin.lng,
      direccion: `Load origen ${index}`,
    },
    destino: {
      lat: destLat + (index % 20) * 0.00005,
      lng: destLng - (index % 20) * 0.00005,
      direccion: `Load destino ${index}`,
    },
    metodoPago: "efectivo",
    city,
    tipo: "viaje",
  });
}

function jitterPoint(index) {
  const row = Math.floor(index / 50);
  const col = index % 50;
  return {
    lat: Number((baseLat + row * 0.00008 + col * 0.00001).toFixed(7)),
    lng: Number((baseLng - row * 0.00008 - col * 0.00001).toFixed(7)),
  };
}

function reportStatus() {
  const elapsedSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(1));
  console.log(JSON.stringify({
    event: "load_status",
    elapsedSeconds,
    ...metrics,
    active: sockets.filter((socket) => socket.connected).length,
    connectP95Ms: percentile(connectTimes, 95),
    tripConfirmP95Ms: percentile(tripLatencies, 95),
    locationIntervalAvgMs: average(locationIntervals),
  }));
}

function shutdown(code = 0) {
  timers.forEach(clearTimeout);
  timers.forEach(clearInterval);
  sockets.forEach((socket) => socket.disconnect());
  reportStatus();
  console.log(JSON.stringify({
    event: "load_done",
    runId: fixtures.runId,
    ...metrics,
    active: sockets.filter((socket) => socket.connected).length,
    connectP50Ms: percentile(connectTimes, 50),
    connectP95Ms: percentile(connectTimes, 95),
    connectP99Ms: percentile(connectTimes, 99),
    tripConfirmP50Ms: percentile(tripLatencies, 50),
    tripConfirmP95Ms: percentile(tripLatencies, 95),
    tripConfirmP99Ms: percentile(tripLatencies, 99),
    locationIntervalAvgMs: average(locationIntervals),
  }));
  process.exitCode = code;
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

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1);
  return sorted[index];
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function randomInt(min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(low + Math.random() * (high - low + 1));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
