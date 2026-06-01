const { redis } = require("../../config/redis");
const { inferCityFromPoint } = require("../../config/cities");
const {
  evaluarElegibilidadReserva
} = require("./reservaEligibility.service");

const GEO_KEY = "motoristas:ubicacion";
const DEBUG = true;
const B2B_URGENTE_KM = 0.6;
const B2B_MEDIO_KM = 2.5;
const DISTANCIA_MAX_KM = 5;
const EXTRA_BUFFER_KM = 1.5;
const MAX_POOL = 5;
const GPS_TIMEOUT_MS = 120000;

const safeNumber = (val, def = 999) => {
  const n = parseFloat(val);
  return isNaN(n) ? def : n;
};

function getGeoKeyForViaje(viaje, origen) {
  const cityId = viaje?.ciudad || inferCityFromPoint(origen)?.id;
  return cityId ? `${GEO_KEY}:${cityId}` : GEO_KEY;
}

function calcularScore({ dist, enViaje, kmRestantes }) {
  let score = dist;

  if (enViaje) {
    score += kmRestantes * 1.2;

    if (kmRestantes <= B2B_URGENTE_KM) {
      score -= 0.8;
    } else if (kmRestantes <= B2B_MEDIO_KM) {
      score -= 0.3;
    }
  }

  return score;
}

async function obtenerCandidatos(viaje, radioKm = DISTANCIA_MAX_KM) {
  try {
    if (!redis) return [];

    if (!viaje?.origen?.lat || !viaje?.origen?.lng) {
      console.warn(`Viaje ${viaje?._id} sin coordenadas`);
      return [];
    }

    const lat = parseFloat(viaje.origen.lat);
    const lng = parseFloat(viaje.origen.lng);
    const origen = { lat, lng };
    const radio = radioKm + EXTRA_BUFFER_KM;
    const geoKey = getGeoKeyForViaje(viaje, origen);

    if (DEBUG) {
      console.log(`BUSQUEDA -> geo:${geoKey} lat:${lat} lng:${lng} radio:${radio}km`);
    }

    const [estado, cancelado] = await Promise.all([
      redis.get(`viaje:status:${viaje._id}`),
      redis.get(`viaje:cancelado:${viaje._id}`)
    ]);

    if (cancelado || estado === "aceptado") return [];

    const raw = await redis.call(
      "GEOSEARCH",
      geoKey,
      "FROMLONLAT",
      String(lng),
      String(lat),
      "BYRADIUS",
      String(radio),
      "km",
      "WITHDIST",
      "ASC"
    );

    if (!raw?.length) return [];

    const candidatos = raw.slice(0, 25).map(([id, dist]) => ({
      id,
      dist: safeNumber(dist, 999)
    }));

    const pipe = redis.multi();
    candidatos.forEach((c) => {
      pipe.hgetall(`motorista:data:${c.id}`);
      pipe.get(`lock:cola:${c.id}`);
    });

    const res = await pipe.exec();
    const candidatosScored = [];

    for (let i = 0; i < candidatos.length; i++) {
      const { id, dist } = candidatos[i];
      const data = res[i * 2]?.[1];
      const lock = res[i * 2 + 1]?.[1];

      if (!data || Object.keys(data).length === 0) continue;

      if (viaje.ciudad && data.city && data.city !== viaje.ciudad) continue;

      const ultimaAct = parseInt(data.lastUpdate || 0);
      const ahora = Date.now();

      if (ultimaAct !== 0 && ahora - ultimaAct > GPS_TIMEOUT_MS) {
        const online = await redis.exists(`motorista:online:${id}`);

        if (online) {
          await redis.hset(`motorista:data:${id}`, "lastUpdate", ahora.toString());

          if (data.lat && data.lng) {
            await redis.call("GEOADD", geoKey, data.lng, data.lat, id);
          }

          data.lastUpdate = ahora.toString();
        } else {
          if (DEBUG) {
            console.log(`Motorista ${id} descartado por GPS viejo`);
          }

          await redis.zrem(GEO_KEY, id);
          await redis.zrem(geoKey, id);
          await redis.hset(`motorista:data:${id}`, {
            disponible: "false",
            online: "false"
          });

          continue;
        }
      }

      const tieneReserva = !!lock;
      const enViaje = data.viajeActualId && data.viajeActualId !== "null";
      const disponible = data.disponible === "true";
      let kmRestantes = safeNumber(data.kmRestantes);
      let reservaElegible = null;

      if (enViaje) {
        reservaElegible = await evaluarElegibilidadReserva({
          motoristaId: id,
          data,
          tieneReserva
        });

        if (reservaElegible.kmRestantes != null) {
          kmRestantes = reservaElegible.kmRestantes;
        }
      }

      const esLibre = disponible && !enViaje;
      const esB2B =
        enViaje &&
        reservaElegible?.permitir === true;

      let tipo = null;
      if (esLibre) tipo = "LIBRE";
      else if (esB2B && kmRestantes <= B2B_URGENTE_KM) tipo = "B2B_URGENTE";
      else if (esB2B) tipo = "B2B_MEDIO";
      else continue;

      const score = calcularScore({ dist, enViaje, kmRestantes });
      candidatosScored.push({ id, score, dist, kmRestantes, tipo });
    }

    const [bloq, rech, excl, ofert] = await Promise.all([
      redis.smembers(`viaje:saldoBloqueados:${viaje._id}`),
      redis.smembers(`viaje:rechazados:${viaje._id}`),
      redis.smembers(`viaje:excluidos:${viaje._id}`),
      redis.smembers(`viaje:ofertandos:${viaje._id}`)
    ]);

    const excluidos = new Set([
      ...(bloq || []),
      ...(rech || []),
      ...(excl || []),
      ...(ofert || [])
    ]);

    return candidatosScored
      .filter((c) => !excluidos.has(c.id))
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_POOL);
  } catch (err) {
    console.error("obtenerCandidatos crash:", err);
    return [];
  }
}

module.exports = { obtenerCandidatos };
