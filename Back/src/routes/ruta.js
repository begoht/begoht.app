const express = require("express");
const http = require("http");
const https = require("https");
const router = express.Router();
const { pointInCity, resolveCityForPoints } = require("../config/cities");

const OSRM_URL = process.env.OSRM_URL || "http://localhost:5000";
const OSRM_FALLBACK_URL = process.env.OSRM_FALLBACK_URL || "https://router.project-osrm.org";
const OSRM_TIMEOUT_MS = Number(process.env.OSRM_TIMEOUT_MS || 4500);
const ROUTE_CACHE_TTL_MS = 60 * 1000;
const ROUTE_CACHE_MAX = 500;
const routeCache = new Map();

function normalizarPunto(p) {
  return {
    lng: Number(p.lng),
    lat: Number(p.lat)
  };
}

function puntoValido(p) {
  return Number.isFinite(p.lng) && Number.isFinite(p.lat);
}

function cacheKey(puntos) {
  return puntos
    .map((p) => `${p.lng.toFixed(4)},${p.lat.toFixed(4)}`)
    .join(";");
}

function limpiarCacheSiHaceFalta() {
  if (routeCache.size < ROUTE_CACHE_MAX) return;

  const now = Date.now();
  for (const [key, value] of routeCache.entries()) {
    if (value.expiresAt <= now || routeCache.size >= ROUTE_CACHE_MAX) {
      routeCache.delete(key);
    }
  }
}

function getOsrmCandidates() {
  return [...new Set([OSRM_URL, OSRM_FALLBACK_URL].filter(Boolean))];
}

function requestText(url, timeoutMs = OSRM_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, (response) => {
      let body = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          text: body
        });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("OSRM timeout"));
    });

    req.on("error", reject);
  });
}

function distanciaMetros(a, b) {
  const radioTierra = 6371000;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return 2 * radioTierra * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function crearRutaFallback(puntos) {
  if (!puntos.every(puntoValido)) return null;

  const distance = puntos.slice(1).reduce((total, punto, index) => {
    return total + distanciaMetros(puntos[index], punto);
  }, 0);

  return {
    geometry: {
      type: "LineString",
      coordinates: puntos.map((p) => [p.lng, p.lat])
    },
    distance,
    duration: Math.max(60, Math.round(distance / 6)),
    fallback: true,
    source: "straight-line"
  };
}

function puntosDentroDeCiudad(puntos, city) {
  if (!city?.enabled) return false;
  return puntos.every((p) => pointInCity(p, city));
}

function rutaDentroDeCiudad(route, city) {
  const coords = route?.geometry?.coordinates;
  if (!city || !Array.isArray(coords) || !coords.length) return true;

  return coords.every(([lng, lat]) => pointInCity({ lat, lng }, city));
}

async function consultarRutaOSRM(puntos, city = null) {
  const puntosNorm = puntos.map(normalizarPunto);

  if (!puntosNorm.every(puntoValido)) {
    return null;
  }

  const key = cacheKey(puntosNorm);
  const cached = routeCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.route;
  }

  const coords = puntosNorm.map((p) => `${p.lng},${p.lat}`).join(";");

  for (const baseUrl of getOsrmCandidates()) {
    const url = `${baseUrl.replace(/\/$/, "")}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    try {
      const response = await requestText(url);

      if (!response.ok) {
        console.warn("OSRM ERROR:", response.status, response.text.slice(0, 200));
        continue;
      }

      const data = JSON.parse(response.text);
      const route = data.routes?.[0] || null;

      if (route && rutaDentroDeCiudad(route, city)) {
        limpiarCacheSiHaceFalta();
        routeCache.set(key, {
          route,
          expiresAt: Date.now() + ROUTE_CACHE_TTL_MS
        });
        return route;
      }

      if (route) {
        console.warn("OSRM fuera de ciudad activa:", city?.id || "sin-ciudad");
      }
    } catch (err) {
      console.warn("OSRM no disponible:", baseUrl, err.message);
    }
  }

  const fallbackRoute = crearRutaFallback(puntosNorm);

  if (fallbackRoute) {
    limpiarCacheSiHaceFalta();
    routeCache.set(key, {
      route: fallbackRoute,
      expiresAt: Date.now() + ROUTE_CACHE_TTL_MS
    });
  }

  return fallbackRoute;
}

router.get("/simple", async (req, res) => {
  try {
    const { oLng, oLat, dLng, dLat, city: cityId } = req.query;

    if (!oLng || !oLat || !dLng || !dLat) {
      return res.status(400).json({ error: "Faltan coordenadas" });
    }

    const puntos = [
      { lng: oLng, lat: oLat },
      { lng: dLng, lat: dLat }
    ].map(normalizarPunto);

    const city = resolveCityForPoints(cityId, puntos);

    if (!puntosDentroDeCiudad(puntos, city)) {
      return res.status(400).json({
        error: "Coordenadas fuera de la ciudad activa",
        city: city?.id || null
      });
    }

    const route = await consultarRutaOSRM(puntos, city);

    if (!route) {
      return res.status(404).json({ error: "No hay rutas" });
    }

    res.json({ code: "Ok", city: city.id, routes: [route] });
  } catch (err) {
    console.error("Error ruta simple:", err);
    res.status(500).json({ error: "Error interno obteniendo ruta" });
  }
});

router.get("/reserva", async (req, res) => {
  try {
    const { oLng, oLat, dLng, dLat, pLng, pLat, city: cityId } = req.query;

    if (!oLng || !oLat || !dLng || !dLat || !pLng || !pLat) {
      return res.status(400).json({ error: "Faltan coordenadas" });
    }

    const puntos = [
      { lng: oLng, lat: oLat },
      { lng: dLng, lat: dLat },
      { lng: pLng, lat: pLat }
    ].map(normalizarPunto);

    const city = resolveCityForPoints(cityId, puntos);

    if (!puntosDentroDeCiudad(puntos, city)) {
      return res.status(400).json({
        error: "Coordenadas fuera de la ciudad activa",
        city: city?.id || null
      });
    }

    const [actual, haciaPasajero] = await Promise.all([
      consultarRutaOSRM([puntos[0], puntos[1]], city),
      consultarRutaOSRM([puntos[1], puntos[2]], city)
    ]);

    if (!actual && !haciaPasajero) {
      return res.status(404).json({ error: "No hay rutas" });
    }

    res.json({
      code: "Ok",
      city: city.id,
      segmentos: {
        actual,
        haciaPasajero
      },
      routes: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              ...(actual?.geometry?.coordinates || []),
              ...(haciaPasajero?.geometry?.coordinates || [])
            ]
          },
          distance: (actual?.distance || 0) + (haciaPasajero?.distance || 0),
          duration: (actual?.duration || 0) + (haciaPasajero?.duration || 0)
        }
      ]
    });
  } catch (err) {
    console.error("Error ruta reserva:", err);
    res.status(500).json({ error: "Error interno obteniendo ruta" });
  }
});

module.exports = router;
