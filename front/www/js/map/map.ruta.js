import { getMap } from "./map.singleton.js?v=20260628-map-single-layer";

import {
  mismaPosicion,
  coordsValidas
} from "./utils/map.coords.js";

import {
  fetchRutaSimple,
  fetchRutaReserva
} from "./services/map.route.js?v=20260624-cordoba-gps";

import {
  renderRuta,
  renderRutaReserva,
  renderLineaRecta,
  limpiarRuta
} from "./ui/map.route.renderer.js?v=20260628-map-single-layer";

let ultimaRutaCalculada = 0;

let ultimaRutaSimpleCalculada = 0;

let rutaInicialDibujada = false;

let currentRouteController = null;

let routeRequestId = 0;

let lastOrigen = null;

let lastDestino = null;

let lastReservaOrigen = null;

let lastReservaDestinoActual = null;

let lastReservaOrigenPasajero = null;

const MIN_RECALC_SIMPLE_MS = 15000;

const MIN_RECALC_RESERVA_MS = 15000;

const MIN_RECALC_METROS = 80;

function distanciaMetros(a, b) {
  if (!coordsValidas(a) || !coordsValidas(b)) return Infinity;

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

/*************************************************
 * 🚗 RUTA SIMPLE
 *************************************************/
export async function dibujarRuta(
  origen,
  destino,
  force = false
) {

  const map = getMap();

  if (!map) return;

  if (
    !coordsValidas(origen) ||
    !coordsValidas(destino)
  ) {
    return;
  }

  if (
    !force &&
    mismaPosicion(origen, lastOrigen) &&
    mismaPosicion(destino, lastDestino)
  ) {
    return;
  }

  const ahora = Date.now();
  const mismoDestino = mismaPosicion(destino, lastDestino);

  if (!force && lastOrigen && mismoDestino) {
    const movidoMetros = distanciaMetros(origen, lastOrigen);
    const tiempoDesdeUltima = ahora - ultimaRutaSimpleCalculada;

    if (
      movidoMetros < MIN_RECALC_METROS ||
      tiempoDesdeUltima < MIN_RECALC_SIMPLE_MS
    ) {
      return;
    }
  }

  lastOrigen = origen;
  lastDestino = destino;
  ultimaRutaSimpleCalculada = ahora;

  if (currentRouteController) {
    currentRouteController.abort();
  }

  currentRouteController =
    new AbortController();

  const requestId = ++routeRequestId;

  try {

    const data =
      await fetchRutaSimple(
        origen,
        destino,
        currentRouteController.signal
      );

    if (requestId !== routeRequestId) {
      return;
    }

    if (!data) {
      renderLineaRecta(
        map,
        origen,
        destino,
        { fit: !rutaInicialDibujada }
      );
      rutaInicialDibujada = true;
      return;
    }

    const geometry =
      data.routes?.[0]?.geometry?.coordinates;

    if (!geometry?.length) {

      renderLineaRecta(
        map,
        origen,
        destino,
        { fit: !rutaInicialDibujada }
      );
      rutaInicialDibujada = true;

      return;
    }

    const coords = geometry.map(
      ([lng, lat]) => [lat, lng]
    );

    const route =
      renderRuta(map, coords);

    if (!rutaInicialDibujada) {

      map.fitBounds(
        route.getBounds(),
        {
          padding: [80, 80],
          animate: true,
          duration: 0.6
        }
      );

      rutaInicialDibujada = true;
    }

  } catch (err) {

    console.error(
      "❌ dibujarRuta:",
      err.message
    );

    renderLineaRecta(
      map,
      origen,
      destino,
      { fit: !rutaInicialDibujada }
    );
    rutaInicialDibujada = true;
  }
}

/*************************************************
 * 🛵 RUTA RESERVA
 *************************************************/
export async function dibujarRutaReserva(
  origen,
  destinoActual,
  origenPasajero,
  onETA,
  force = false
) {

  const map = getMap();

  if (!map) return;

  if (
    !coordsValidas(origen) ||
    !coordsValidas(destinoActual) ||
    !coordsValidas(origenPasajero)
  ) {
    return;
  }

  const ahora = Date.now();
  const cambioDestinoActual = !mismaPosicion(destinoActual, lastReservaDestinoActual);
  const cambioOrigenPasajero = !mismaPosicion(origenPasajero, lastReservaOrigenPasajero);
  const movidoMetros = distanciaMetros(origen, lastReservaOrigen);
  const tiempoDesdeUltima = ahora - ultimaRutaCalculada;

  if (
    !force &&
    lastReservaOrigen &&
    !cambioDestinoActual &&
    !cambioOrigenPasajero &&
    (
      movidoMetros < MIN_RECALC_METROS ||
      tiempoDesdeUltima < MIN_RECALC_RESERVA_MS
    )
  ) {
    return;
  }

  ultimaRutaCalculada = ahora;
  lastReservaOrigen = origen;
  lastReservaDestinoActual = destinoActual;
  lastReservaOrigenPasajero = origenPasajero;

  if (currentRouteController) {
    currentRouteController.abort();
  }

  currentRouteController =
    new AbortController();

  const requestId = ++routeRequestId;

  try {

    const data =
      await fetchRutaReserva(
        origen,
        destinoActual,
        origenPasajero,
        currentRouteController.signal
      );

    if (requestId !== routeRequestId) {
      return;
    }

    if (!data) {
      renderRutaReserva(
        map,
        [
          [origen.lat, origen.lng],
          [destinoActual.lat, destinoActual.lng]
        ],
        [
          [destinoActual.lat, destinoActual.lng],
          [origenPasajero.lat, origenPasajero.lng]
        ],
        {
          fit: !rutaInicialDibujada,
          stopover: destinoActual
        }
      );
      rutaInicialDibujada = true;
      return;
    }

    const route = data.routes?.[0];
    const tramoActual = data.segmentos?.actual || data.segments?.actual || null;
    const tramoHaciaPasajero = data.segmentos?.haciaPasajero || data.segments?.haciaPasajero || null;

    if (!route && !tramoActual && !tramoHaciaPasajero) {
      renderRutaReserva(
        map,
        [
          [origen.lat, origen.lng],
          [destinoActual.lat, destinoActual.lng]
        ],
        [
          [destinoActual.lat, destinoActual.lng],
          [origenPasajero.lat, origenPasajero.lng]
        ],
        {
          fit: !rutaInicialDibujada,
          stopover: destinoActual
        }
      );
      rutaInicialDibujada = true;
      return;
    }

    const coordsActual = tramoActual?.geometry?.coordinates?.map(
      ([lng, lat]) => [lat, lng]
    ) || [];

    const coordsHaciaPasajero = tramoHaciaPasajero?.geometry?.coordinates?.map(
      ([lng, lat]) => [lat, lng]
    ) || [];

    if (coordsActual.length || coordsHaciaPasajero.length) {
      renderRutaReserva(map, coordsActual, coordsHaciaPasajero, {
        fit: !rutaInicialDibujada,
        stopover: destinoActual
      });
      rutaInicialDibujada = true;
      onETA?.({
        actual: tramoActual,
        haciaPasajero: tramoHaciaPasajero
      });
      return;
    }

    const coords =
      route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng]
      );

    renderRutaReserva(map, coords, [], {
      fit: !rutaInicialDibujada,
      stopover: destinoActual
    });
    rutaInicialDibujada = true;

  } catch (err) {

    console.error(
      "❌ Reserva:",
      err.message
    );
  }
}

/*************************************************
 * 🧹 LIMPIAR
 *************************************************/
export function limpiarRutas(
  resetCamera = true
) {

  const map = getMap();

  if (!map) return;

  limpiarRuta(map);

  if (resetCamera) {
    resetRutaCache();
  }
}

export function resetRutaCache() {
  ultimaRutaCalculada = 0;
  ultimaRutaSimpleCalculada = 0;
  rutaInicialDibujada = false;
  lastOrigen = null;
  lastDestino = null;
  lastReservaOrigen = null;
  lastReservaDestinoActual = null;
  lastReservaOrigenPasajero = null;

  if (currentRouteController) {
    currentRouteController.abort();
    currentRouteController = null;
  }
}
