#!/usr/bin/env node

require("dotenv").config({ quiet: true });

const os = require("os");
const { execFile } = require("child_process");
const mongoose = require("mongoose");
const { redis } = require("../../src/config/redis");

const args = parseArgs(process.argv.slice(2));
const label = args.label || process.env.LOAD_METRICS_LABEL || "snapshot";

redis.removeAllListeners("connect");
redis.removeAllListeners("error");
redis.on("error", () => {});

main().catch((error) => {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    label,
    ok: false,
    error: error.message,
  }));
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect().catch(() => {});
  redis.disconnect();
});

async function main() {
  const [pm2, redisMetrics, mongo] = await Promise.all([
    pm2Snapshot().catch((error) => ({ ok: false, error: error.message, apps: [] })),
    redisSnapshot().catch((error) => ({ ok: false, error: error.message })),
    mongoSnapshot().catch((error) => ({ ok: false, error: error.message })),
  ]);

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    label,
    ok: true,
    os: {
      loadavg: os.loadavg(),
      totalMemMb: bytesToMb(os.totalmem()),
      freeMemMb: bytesToMb(os.freemem()),
      usedMemMb: bytesToMb(os.totalmem() - os.freemem()),
      cpus: os.cpus().length,
    },
    pm2,
    redis: redisMetrics,
    mongo,
  }));
}

async function pm2Snapshot() {
  const apps = await execJson(process.env.PM2_BIN || "pm2", ["jlist"]);
  return {
    ok: true,
    apps: apps
      .filter((app) => ["bego-api", "bego-monitor"].includes(app.name))
      .map((app) => ({
        name: app.name,
        status: app.pm2_env?.status || "unknown",
        restarts: Number(app.pm2_env?.restart_time || 0),
        instances: app.pm2_env?.instances || 1,
        cpu: Number(app.monit?.cpu || 0),
        memoryMb: bytesToMb(Number(app.monit?.memory || 0)),
        pid: app.pid,
      })),
  };
}

async function redisSnapshot() {
  const [info, dbsize, clients] = await Promise.all([
    redis.info(),
    redis.dbsize(),
    redis.info("clients"),
  ]);
  const data = parseRedisInfo(info);
  const clientData = parseRedisInfo(clients);
  return {
    ok: true,
    dbsize,
    connectedClients: Number(clientData.connected_clients || 0),
    usedMemoryMb: bytesToMb(Number(data.used_memory || 0)),
    usedMemoryPeakMb: bytesToMb(Number(data.used_memory_peak || 0)),
    opsPerSec: Number(data.instantaneous_ops_per_sec || 0),
    totalCommandsProcessed: Number(data.total_commands_processed || 0),
    rejectedConnections: Number(data.rejected_connections || 0),
    expiredKeys: Number(data.expired_keys || 0),
    evictedKeys: Number(data.evicted_keys || 0),
    keyspaceHits: Number(data.keyspace_hits || 0),
    keyspaceMisses: Number(data.keyspace_misses || 0),
  };
}

async function mongoSnapshot() {
  if (!process.env.MONGO_URI) return { ok: false, error: "MONGO_URI missing" };
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  const admin = mongoose.connection.db.admin();
  const [serverStatus, dbStats] = await Promise.all([
    admin.serverStatus().catch((error) => ({ ok: false, error: error.message })),
    mongoose.connection.db.stats(),
  ]);
  return {
    ok: true,
    serverStatusAllowed: serverStatus.ok !== false,
    serverStatusError: serverStatus.ok === false ? serverStatus.error : null,
    connections: serverStatus.connections || null,
    opcounters: serverStatus.opcounters || null,
    mem: serverStatus.mem || null,
    db: {
      collections: dbStats.collections,
      objects: dbStats.objects,
      dataSizeMb: bytesToMb(dbStats.dataSize || 0),
      storageSizeMb: bytesToMb(dbStats.storageSize || 0),
      indexes: dbStats.indexes,
      indexSizeMb: bytesToMb(dbStats.indexSize || 0),
    },
  };
}

function execJson(command, args = []) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 7000 }, (error, stdout, stderr) => {
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

function parseRedisInfo(info) {
  return String(info || "")
    .split(/\r?\n/)
    .reduce((acc, line) => {
      if (!line || line.startsWith("#")) return acc;
      const index = line.indexOf(":");
      if (index === -1) return acc;
      acc[line.slice(0, index)] = line.slice(index + 1).trim();
      return acc;
    }, {});
}

function bytesToMb(value) {
  return Number((Number(value || 0) / 1024 / 1024).toFixed(2));
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
