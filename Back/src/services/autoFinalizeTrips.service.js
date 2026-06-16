const crypto = require("crypto");
const Viaje = require("../models/Viaje");
const { redis } = require("../config/redis");
const finalizarViaje = require("./finalizarViaje.service");

const DEFAULT_THRESHOLD_MINUTES = 60;
const DEFAULT_INTERVAL_MS = 60 * 1000;
const DEFAULT_BATCH_LIMIT = 10;

let timer = null;
let running = false;

function startAutoFinalizeTrips({ io = global.io } = {}) {
  if (timer || process.env.AUTO_FINALIZE_TRIPS_ENABLED === "false") return;

  const intervalMs = readPositiveInt(
    process.env.AUTO_FINALIZE_TRIPS_INTERVAL_MS,
    DEFAULT_INTERVAL_MS
  );

  timer = setInterval(() => runAutoFinalize({ io }), intervalMs);
  timer.unref?.();

  setTimeout(() => runAutoFinalize({ io }), 15000).unref?.();
}

async function runAutoFinalize({ io = global.io } = {}) {
  if (running) return;
  running = true;

  const intervalMs = readPositiveInt(
    process.env.AUTO_FINALIZE_TRIPS_INTERVAL_MS,
    DEFAULT_INTERVAL_MS
  );
  const lockId = crypto.randomUUID();
  const lockTtl = readPositiveInt(
    process.env.AUTO_FINALIZE_TRIPS_LOCK_MS,
    Math.max(intervalMs, 30000)
  );

  try {
    const locked = await redis.set("lock:auto-finalize-trips", lockId, "NX", "PX", lockTtl);
    if (!locked) return;

    const thresholdMinutes = readPositiveInt(
      process.env.AUTO_FINALIZE_TRIPS_AFTER_MINUTES,
      DEFAULT_THRESHOLD_MINUTES
    );
    const limit = readPositiveInt(
      process.env.AUTO_FINALIZE_TRIPS_BATCH_LIMIT,
      DEFAULT_BATCH_LIMIT
    );
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const viajes = await Viaje.find({
      estado: "en_curso",
      finalizacionProcesada: { $ne: true },
      motorista: { $ne: null },
      inicioViajeAt: { $lte: cutoff }
    })
      .select("_id motorista inicioViajeAt")
      .sort({ inicioViajeAt: 1 })
      .limit(limit)
      .lean();

    for (const viaje of viajes) {
      try {
        await finalizarViaje({
          io,
          socket: null,
          viajeId: viaje._id.toString(),
          motoristaId: viaje.motorista.toString(),
          enforceProximity: false,
          enforceDeliveryCode: false,
          source: "auto_timeout",
          motivo: "auto_una_hora_sin_finalizar",
          emitErrors: false,
          throwOnError: true
        });
      } catch (err) {
        console.error(`Auto-finalizacion fallo para viaje ${viaje._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Auto-finalizacion de viajes fallo:", err.message);
  } finally {
    running = false;
    await releaseLock(lockId).catch(() => {});
  }
}

async function releaseLock(lockId) {
  const script = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
  await redis.eval(script, 1, "lock:auto-finalize-trips", lockId);
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = {
  startAutoFinalizeTrips,
  runAutoFinalize
};
