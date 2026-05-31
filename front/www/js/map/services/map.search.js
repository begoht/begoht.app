import {
  cityConfig,
  coordsInCity,
  getSearchViewbox
} from "../config/index.js";

let searchController = null;

let lastSearchTime = 0;

/*************************************************
 * 🧠 CONFIG
 *************************************************/
const SEARCH_LIMIT = 5;

const RATE_LIMIT_MS = 800;

/*************************************************
 * 🔍 BUSCAR LUGARES
 *************************************************/
export async function buscarLugares(query) {

  if (!query || query.length < 4) {
    return [];
  }

  /*************************************************
   * 🧠 RATE LIMIT
   *************************************************/
  const now = Date.now();

  if (now - lastSearchTime < RATE_LIMIT_MS) {
    return [];
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
    return Array.isArray(data)
      ? data.filter((item) => coordsInCity({
          lat: Number(item.lat),
          lng: Number(item.lon)
        }))
      : [];

  } catch (err) {

    if (err.name !== "AbortError") {
      console.error(
        "❌ buscarLugares:",
        err.message
      );
    }

    return [];
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
