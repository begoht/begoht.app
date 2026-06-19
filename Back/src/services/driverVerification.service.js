const User = require("../models/User");
const { redis } = require("../config/redis");

const CACHE_TTL_SECONDS = 30;

function cacheKey(driverId) {
  return `motorista:verification:${driverId}`;
}

async function getDriverVerificationStatus(driverId, { useCache = true } = {}) {
  const id = String(driverId || "");
  if (!id) return { verified: false, exists: false };

  if (useCache) {
    const cached = await redis.get(cacheKey(id));
    if (cached === "1") return { verified: true, exists: true };
    if (cached === "0") return { verified: false, exists: true };
    if (cached === "missing") return { verified: false, exists: false };
  }

  const driver = await User.findOne({ _id: id, rol: "motorista" })
    .select("_id verificado saldoBloqueado")
    .lean();

  const value = driver ? (driver.verificado === true ? "1" : "0") : "missing";
  await redis.set(cacheKey(id), value, "EX", CACHE_TTL_SECONDS);

  return {
    exists: Boolean(driver),
    verified: driver?.verificado === true,
    blocked: driver?.saldoBloqueado === true,
  };
}

async function ensureDriverVerified(driverId) {
  const status = await getDriverVerificationStatus(driverId);

  if (!status.exists || !status.verified) {
    const err = new Error("Tu cuenta motorista esta pendiente de verificacion.");
    err.code = "DRIVER_NOT_VERIFIED";
    err.status = status;
    throw err;
  }

  return status;
}

async function filterVerifiedDriverIds(driverIds = []) {
  const ids = [...new Set(driverIds.map(String).filter(Boolean))];
  if (!ids.length) return new Set();

  const drivers = await User.find({
    _id: { $in: ids },
    rol: "motorista",
    verificado: true,
    saldoBloqueado: { $ne: true },
  })
    .select("_id")
    .lean();

  return new Set(drivers.map((driver) => driver._id.toString()));
}

async function invalidateDriverVerification(driverId) {
  if (!driverId) return;
  await redis.del(cacheKey(String(driverId)));
}

module.exports = {
  ensureDriverVerified,
  filterVerifiedDriverIds,
  getDriverVerificationStatus,
  invalidateDriverVerification,
};
