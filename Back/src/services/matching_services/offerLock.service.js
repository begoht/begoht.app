const { redis } = require("../../config/redis");

const OFFER_TTL_MS = Number(process.env.OFFER_TTL_MS || 15000);
const OFFER_LOCK_GRACE_MS = Number(process.env.OFFER_LOCK_GRACE_MS || 2500);
const OFFER_LOCK_TTL_MS = OFFER_TTL_MS + OFFER_LOCK_GRACE_MS;

function getOfferKey(viajeId, motoristaId) {
  return `viaje:oferta:pendiente:${viajeId}:${motoristaId}`;
}

function getOfferLockKey(motoristaId) {
  return `lock:oferta:motorista:${motoristaId}`;
}

function getOfferSetKey(viajeId) {
  return `viaje:ofertandos:${viajeId}`;
}

function extractMotoristaIdFromOfferKey(key) {
  return String(key || "").split(":").pop();
}

async function acquireOfferLock({ viajeId, motoristaId, ttlMs = OFFER_LOCK_TTL_MS }) {
  if (!viajeId || !motoristaId) return false;

  const result = await redis.set(
    getOfferLockKey(motoristaId),
    String(viajeId),
    "NX",
    "PX",
    ttlMs
  );

  return result === "OK";
}

async function releaseOfferLock({ viajeId, motoristaId }) {
  if (!viajeId || !motoristaId) return 0;

  return redis.eval(
    `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      end

      return 0
    `,
    1,
    getOfferLockKey(motoristaId),
    String(viajeId)
  );
}

async function releaseOfferLocksForViaje(viajeId, motoristaIds = []) {
  const uniqueIds = [...new Set((motoristaIds || []).filter(Boolean).map(String))];
  if (!uniqueIds.length) return;

  await Promise.allSettled(
    uniqueIds.map((motoristaId) => releaseOfferLock({ viajeId, motoristaId }))
  );
}

async function scanKeys(pattern, count = 100) {
  const keys = [];
  let cursor = "0";

  do {
    const reply = await redis.scan(cursor, "MATCH", pattern, "COUNT", count);
    cursor = reply[0];

    if (reply[1]?.length) {
      keys.push(...reply[1]);
    }
  } while (cursor !== "0");

  return keys;
}

async function getOfferMotoristaIds(viajeId) {
  const [fromSet, fromScan] = await Promise.all([
    redis.smembers(getOfferSetKey(viajeId)),
    scanKeys(`viaje:oferta:pendiente:${viajeId}:*`)
  ]);

  return [
    ...new Set([
      ...(fromSet || []).map(String),
      ...(fromScan || []).map(extractMotoristaIdFromOfferKey).filter(Boolean)
    ])
  ];
}

module.exports = {
  OFFER_TTL_MS,
  OFFER_LOCK_TTL_MS,
  getOfferKey,
  getOfferLockKey,
  getOfferSetKey,
  acquireOfferLock,
  releaseOfferLock,
  releaseOfferLocksForViaje,
  scanKeys,
  getOfferMotoristaIds,
  extractMotoristaIdFromOfferKey
};
