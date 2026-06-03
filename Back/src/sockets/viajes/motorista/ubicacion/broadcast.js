const { redis } = require("../../../../config/redis");

const RADIO_BUSQUEDA_KM = 5;
const BROADCAST_INTERVAL = 3000;
const lastBroadcast = new Map();

module.exports = async (io, motoristaId, { lat, lng, disponible = true }) => {

  if (!disponible) return;

  const now = Date.now();
  const last = lastBroadcast.get(motoristaId) || 0;

  if (now - last < BROADCAST_INTERVAL) return;

  lastBroadcast.set(motoristaId, now);

  const ids = await redis.geosearch(
    "motoristas:ubicacion",
    "FROMLONLAT",
    lng,
    lat,
    "BYRADIUS",
    RADIO_BUSQUEDA_KM,
    "km"
  );

  if (!ids.length) return;

  const pipeline = redis.pipeline();
  ids.forEach(id => pipeline.hgetall(`motorista:data:${id}`));
  const results = await pipeline.exec();

  const lista = results
    .map(([, data], i) => {
      if (!data || data.disponible !== "true") return null;
      return {
        id: ids[i],
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        heading: data.heading !== "" && data.heading != null ? parseFloat(data.heading) : null
      };
    })
    .filter(Boolean);

  io.to("pasajeros").emit("motoristas-cerca", lista);
};
