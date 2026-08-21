import { getServerUrl } from "../../conexion.js";
import {
  cityConfig,
  inferCityConfigFromCoords
} from "../config/index.js?v=20260624-cordoba-gps";

import { fetchSeguro } from "../utils/map.request.js";

const PUBLIC_OSRM_URL = "https://router.project-osrm.org";

function resolveRouteCity(...points) {
  const inferredCity = points
    .map((point) => inferCityConfigFromCoords(point))
    .find(Boolean);

  return inferredCity?.id || cityConfig.id;
}

function coordsValidas(...points) {
  return points.every((point) => (
    Number.isFinite(Number(point?.lat)) &&
    Number.isFinite(Number(point?.lng))
  ));
}

function buildPublicOsrmUrl(points = []) {
  const coords = points
    .map((point) => `${Number(point.lng)},${Number(point.lat)}`)
    .join(";");

  return `${PUBLIC_OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
}

async function fetchPublicOsrmRoute(points = [], signal) {
  if (!coordsValidas(...points)) return null;

  try {
    const res = await fetch(buildPublicOsrmUrl(points), { signal });
    if (!res.ok) return null;

    const data = await res.json();
    const route = data.routes?.[0] || null;
    const geometry = route?.geometry?.coordinates;

    if (!geometry?.length || route.fallback) return null;

    return {
      ...route,
      source: "public-osrm"
    };
  } catch (err) {
    if (err.name !== "AbortError") {
      console.warn("OSRM publico no disponible:", err.message);
    }
    return null;
  }
}

function shouldTryPublicOsrm(data) {
  return !data?.routes?.[0] || data.routes[0]?.fallback;
}

function buildRouteUrl(path, params) {
  const API = getServerUrl();
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    query.set(key, String(value));
  });

  return `${API}${path}?${query.toString()}`;
}

/*************************************************
 * 🚗 RUTA SIMPLE
 *************************************************/
export async function fetchRutaSimple(
  origen,
  destino,
  signal
) {

  const url = buildRouteUrl("/api/ruta/simple", {
    oLng: origen.lng,
    oLat: origen.lat,
    dLng: destino.lng,
    dLat: destino.lat,
    city: resolveRouteCity(origen, destino)
  });

  const data = await fetchSeguro(url, signal);

  if (!shouldTryPublicOsrm(data)) {
    return data;
  }

  const publicRoute = await fetchPublicOsrmRoute([origen, destino], signal);
  if (!publicRoute) return data;

  return {
    code: "Ok",
    city: resolveRouteCity(origen, destino),
    routes: [publicRoute]
  };
}

/*************************************************
 * 🛵 RUTA RESERVA
 *************************************************/
export async function fetchRutaReserva(
  origen,
  destinoActual,
  origenPasajero,
  signal
) {

  const url = buildRouteUrl("/api/ruta/reserva", {
    oLng: origen.lng,
    oLat: origen.lat,
    dLng: destinoActual.lng,
    dLat: destinoActual.lat,
    pLng: origenPasajero.lng,
    pLat: origenPasajero.lat,
    city: resolveRouteCity(origen, destinoActual, origenPasajero)
  });

  const data = await fetchSeguro(url, signal);

  if (!shouldTryPublicOsrm(data)) {
    return data;
  }

  const [actual, haciaPasajero] = await Promise.all([
    fetchPublicOsrmRoute([origen, destinoActual], signal),
    fetchPublicOsrmRoute([destinoActual, origenPasajero], signal)
  ]);

  if (!actual && !haciaPasajero) return data;

  return {
    code: "Ok",
    city: resolveRouteCity(origen, destinoActual, origenPasajero),
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
        duration: (actual?.duration || 0) + (haciaPasajero?.duration || 0),
        source: "public-osrm"
      }
    ]
  };
}
