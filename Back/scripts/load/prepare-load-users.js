#!/usr/bin/env node

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const Wallet = require("../../src/models/Wallet");
const Viaje = require("../../src/models/Viaje");

const args = parseArgs(process.argv.slice(2));
const mode = args.mode || "create";
const runId = cleanRunId(args.runId || process.env.LOAD_RUN_ID || new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14));
const drivers = positiveInt(args.drivers || process.env.LOAD_DRIVERS, 1800);
const passengers = positiveInt(args.passengers || process.env.LOAD_PASSENGERS, 200);
const outFile = args.out || process.env.LOAD_TOKENS_OUT || path.resolve(process.cwd(), `load-fixtures-${runId}.json`);
const jwtExpiresIn = args.expiresIn || process.env.LOAD_JWT_EXPIRES_IN || "2h";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  assertConfig();
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  if (mode === "cleanup") {
    const result = await cleanupRun(runId);
    console.log(JSON.stringify({ event: "cleanup_done", runId, ...result }));
    await mongoose.disconnect();
    return;
  }

  if (mode === "create") {
    await cleanupRun(runId);
    const created = await createUsers(runId, drivers, passengers);
    const payload = buildTokenFile(runId, created.drivers, created.passengers, jwtExpiresIn);

    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));

    console.log(JSON.stringify({
      event: "fixtures_created",
      runId,
      drivers: payload.drivers.length,
      passengers: payload.passengers.length,
      outFile: path.resolve(outFile),
    }));

    await mongoose.disconnect();
    return;
  }

  throw new Error(`Modo invalido: ${mode}`);
}

function assertConfig() {
  if (!process.env.MONGO_URI) throw new Error("Falta MONGO_URI");
  if (!process.env.JWT_SECRET) throw new Error("Falta JWT_SECRET");
}

async function cleanupRun(id) {
  const phonePrefix = phonePrefixFor(id);
  const users = await User.find({ telefono: { $regex: `^${escapeRegex(phonePrefix)}` } }).select("_id").lean();
  const userIds = users.map((user) => user._id);

  const [viajes, wallets, deletedUsers] = await Promise.all([
    userIds.length
      ? Viaje.deleteMany({ $or: [{ pasajero: { $in: userIds } }, { motorista: { $in: userIds } }] })
      : { deletedCount: 0 },
    userIds.length ? Wallet.deleteMany({ userId: { $in: userIds } }) : { deletedCount: 0 },
    User.deleteMany({ telefono: { $regex: `^${escapeRegex(phonePrefix)}` } }),
  ]);

  return {
    deletedUsers: deletedUsers.deletedCount || 0,
    deletedWallets: wallets.deletedCount || 0,
    deletedTrips: viajes.deletedCount || 0,
  };
}

async function createUsers(id, driverCount, passengerCount) {
  const now = new Date();
  const password = "load-test-disabled";
  const docs = [];

  for (let index = 0; index < driverCount; index += 1) {
    docs.push({
      nombre: "LoadDriver",
      apellido: String(index).padStart(5, "0"),
      telefono: `${phonePrefixFor(id)}driver-${index}`,
      password,
      rol: "motorista",
      telefonoVerificado: true,
      verificado: true,
      disponible: true,
      online: false,
      vehiculo: {
        marca: "BeGO",
        modelo: "Load",
        placa: `LD${String(index).padStart(5, "0")}`,
        color: "Azul",
      },
      ubicacionActual: { lat: 18.2395, lng: -72.5373 },
      alias: `load${id}d${index}`.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    });
  }

  for (let index = 0; index < passengerCount; index += 1) {
    docs.push({
      nombre: "LoadPassenger",
      apellido: String(index).padStart(5, "0"),
      telefono: `${phonePrefixFor(id)}passenger-${index}`,
      password,
      rol: "pasajero",
      telefonoVerificado: true,
      verificado: true,
      online: false,
      alias: `load${id}p${index}`.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    });
  }

  const inserted = await User.insertMany(docs, { ordered: false });
  const driverUsers = inserted.filter((user) => user.rol === "motorista");
  const passengerUsers = inserted.filter((user) => user.rol === "pasajero");

  return {
    drivers: driverUsers,
    passengers: passengerUsers,
  };
}

function buildTokenFile(id, driverUsers, passengerUsers, expiresIn) {
  return {
    runId: id,
    createdAt: new Date().toISOString(),
    expiresIn,
    drivers: driverUsers.map((user) => tokenEntry(user, expiresIn)),
    passengers: passengerUsers.map((user) => tokenEntry(user, expiresIn)),
  };
}

function tokenEntry(user, expiresIn) {
  const id = user._id.toString();
  return {
    id,
    rol: user.rol,
    token: jwt.sign(
      { id, tokenVersion: Number(user.tokenVersion || 0) },
      process.env.JWT_SECRET,
      { expiresIn }
    ),
  };
}

function phonePrefixFor(id) {
  return `load-${id}-`;
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

function cleanRunId(value) {
  return String(value || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "load";
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
