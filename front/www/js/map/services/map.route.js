import { getServerUrl } from "../../conexion.js";
import { cityConfig } from "../config/index.js";

import { fetchSeguro } from "../utils/map.request.js";

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
    city: cityConfig.id
  });

  return fetchSeguro(url, signal);
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
    city: cityConfig.id
  });

  return fetchSeguro(url, signal);
}
