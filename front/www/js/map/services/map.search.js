import {
  cityConfig,
  coordsInCity,
  getSearchViewbox
} from "../config/index.js?v=20260624-cordoba-gps";

let searchController = null;

let lastSearchTime = 0;

/*************************************************
 * 🧠 CONFIG
 *************************************************/
const SEARCH_LIMIT = 5;

const RATE_LIMIT_MS = 800;

function normalizarTexto(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buscarPOILocales(query) {
  const normalizedQuery = normalizarTexto(query);
  const cityLabel = cityConfig?.map?.searchLabel || cityConfig?.name || "";

  if (!normalizedQuery) return [];

  return (cityConfig?.poi || [])
    .filter((poi) => {
      const haystack = normalizarTexto([
        poi.nombre,
        poi.categoria,
        cityConfig?.name,
        cityConfig?.country
      ].filter(Boolean).join(" "));

      return haystack.includes(normalizedQuery);
    })
    .filter((poi) => coordsInCity({ lat: Number(poi.lat), lng: Number(poi.lng) }))
    .slice(0, SEARCH_LIMIT)
    .map((poi) => ({
      lat: String(poi.lat),
      lon: String(poi.lng),
      display_name: `${poi.nombre}, ${cityLabel}`,
      class: "place",
      type: poi.categoria || "poi",
      source: "local-poi"
    }));
}

function mergeResults(primary, secondary) {
  const seen = new Set();

  return [...primary, ...secondary].filter((item) => {
    const key = `${Number(item.lat).toFixed(5)},${Number(item.lon).toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, SEARCH_LIMIT);
}

/*************************************************
 * 🔍 BUSCAR LUGARES
 *************************************************/
export async function buscarLugares(query) {

  if (!query || query.length < 4) {
    return [];
  }

  const resultadosLocales = buscarPOILocales(query);

  /*************************************************
   * 🧠 RATE LIMIT
   *************************************************/
  const now = Date.now();

  if (now - lastSearchTime < RATE_LIMIT_MS) {
    return resultadosLocales;
  }

  lastSearchTime = now;

  /*************************************************
   * 🛑 CANCELAR REQUEST PREVIO
   *************************************************/
  cancelarBusqueda();

  searchController = new AbortController();

  try {

    const countryCode =
      cityConfig?.map?.countryCode || "ht";

    const cityLabel =
      cityConfig?.map?.searchLabel || cityConfig?.name || "";

    const queryConCiudad =
      query.toLowerCase().includes(cityConfig?.name?.toLowerCase?.() || "")
        ? query
        : `${query}, ${cityLabel}`;

    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=json` +
      `&q=${encodeURIComponent(queryConCiudad)}` +
      `&limit=${SEARCH_LIMIT}` +
      `&countrycodes=${countryCode}` +
      `&viewbox=${encodeURIComponent(getSearchViewbox())}` +
      `&bounded=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "BeGOApp/1.0"
      },

      signal: searchController.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    /*************************************************
     * 🧹 NORMALIZAR RESPUESTA
     *************************************************/
    const resultadosRemotos = Array.isArray(data)
      ? data.filter((item) => coordsInCity({
          lat: Number(item.lat),
          lng: Number(item.lon)
        }))
      : [];

    return mergeResults(resultadosLocales, resultadosRemotos);

  } catch (err) {

    if (err.name !== "AbortError") {
      console.error(
        "❌ buscarLugares:",
        err.message
      );
    }

    return resultadosLocales;
  }
}

/*************************************************
 * 🛑 CANCELAR BÚSQUEDA
 *************************************************/
export function cancelarBusqueda() {

  if (searchController) {

    searchController.abort();

    searchController = null;
  }
}
