const { redis } = require("../../config/redis");
const {
  getOfferKey,
  getOfferLockKey,
} = require("./offerLock.service");

async function getPendingOfferForDriver(
  motoristaId,
  { client = redis, now = Date.now() } = {}
) {
  const driverId = String(motoristaId || "").trim();
  if (!driverId) return null;

  const lockedViajeId = await client.get(getOfferLockKey(driverId));
  if (!lockedViajeId) return null;

  const viajeId = String(lockedViajeId);
  const offerKey = getOfferKey(viajeId, driverId);
  const [rawOffer, redisTtl, tripStatus] = await Promise.all([
    client.get(offerKey),
    client.pttl(offerKey),
    client.get(`viaje:status:${viajeId}`),
  ]);

  // El lock que también se valida al aceptar es la fuente de verdad. Un scan
  // puede encontrar restos de otra wave y volver a mostrar una oferta inválida.
  if (!rawOffer || redisTtl <= 0 || tripStatus !== "ofertando") return null;

  let offer;
  try {
    offer = JSON.parse(rawOffer);
  } catch {
    return null;
  }

  const payloadViajeId = String(offer?.viajeId || "");
  if (!payloadViajeId || payloadViajeId !== viajeId) return null;

  const payloadExpiresAt = Number(offer.expira);
  const expiresAt = Number.isFinite(payloadExpiresAt)
    ? payloadExpiresAt
    : now + redisTtl;
  const remainingMs = Math.min(redisTtl, expiresAt - now);

  if (remainingMs <= 0) return null;

  return {
    ...offer,
    viajeId,
    expira: expiresAt,
    ttl: remainingMs,
    isRecovery: true,
  };
}

module.exports = { getPendingOfferForDriver };
