let rutaActualLayer = null;

let puntoIntermedioMarker = null;

let rutaActualCoords = [];

const ROUTE_CONSUME_MAX_DISTANCE_METERS = 120;
const ROUTE_CONSUME_FINISH_METERS = 12;
const ROUTE_FIT_MIN_INTERVAL_MS = 900;

let lastRouteFitAt = 0;

export function getRutaActualCoords() {
  return rutaActualCoords.map((coord) => ({ ...coord }));
}

export function ajustarVistaRuta(map, extraPoints = [], { force = false } = {}) {
  if (!map) return false;

  const now = Date.now();
  if (!force && now - lastRouteFitAt < ROUTE_FIT_MIN_INTERVAL_MS) {
    return false;
  }

  const coords = [
    ...rutaActualCoords,
    ...normalizarCoords(extraPoints)
  ];
  const boundsCoords = compactarCoords(coords)
    .map((coord) => [coord.lat, coord.lng]);

  if (boundsCoords.length < 2 || !window.L?.latLngBounds) return false;

  try {
    map._begoProgrammaticFollow = true;
    map.fitBounds(L.latLngBounds(boundsCoords), {
      paddingTopLeft: [72, 96],
      paddingBottomRight: [72, Math.min(320, Math.max(160, Math.round(window.innerHeight * 0.28)))],
      maxZoom: 17,
      animate: true,
      duration: 0.45
    });
    lastRouteFitAt = now;
    window.setTimeout(() => {
      map._begoProgrammaticFollow = false;
    }, 650);
    return true;
  } catch {
    map._begoProgrammaticFollow = false;
    return false;
  }
}

export function consumirRutaDesde(map, posicion, {
  maxDistanceMeters = ROUTE_CONSUME_MAX_DISTANCE_METERS,
  finishDistanceMeters = ROUTE_CONSUME_FINISH_METERS
} = {}) {
  if (!map || !rutaActualLayer || rutaActualCoords.length < 2) {
    return false;
  }

  if (typeof rutaActualLayer.setLatLngs !== "function") {
    return false;
  }

  const punto = normalizarCoord(posicion);
  if (!punto) return false;

  const snap = proyectarEnRuta(map, punto, rutaActualCoords, maxDistanceMeters);
  if (!snap) return false;

  const destino = rutaActualCoords[rutaActualCoords.length - 1];
  if (distanciaMetros(snap.latLng, destino) <= finishDistanceMeters) {
    rutaActualCoords = [];
    actualizarPolylineCoords([]);
    return true;
  }

  const coordsRestantes = compactarCoords([
    snap.latLng,
    ...rutaActualCoords.slice(snap.segmentIndex + 1)
  ]);

  if (coordsRestantes.length < 2) return false;

  rutaActualCoords = coordsRestantes;
  actualizarPolylineCoords(coordsRestantes);

  return true;
}

/*************************************************
 * 🎨 RENDER RUTA PREMIUM
 *************************************************/
export function renderRuta(map, coords, { fit = false, origen = null, destino = null } = {}) {

  const coordsNormalizados = normalizarCoords([
    origen,
    ...(coords || []),
    destino
  ]);
  const latLngs = coordsNormalizados.map((coord) => [coord.lat, coord.lng]);

  if (latLngs.length < 2) return null;

  if (
    rutaActualLayer?.setLatLngs &&
    rutaActualLayer?._outline?.setLatLngs &&
    rutaActualLayer?._glow?.setLatLngs
  ) {
    rutaActualCoords = coordsNormalizados;
    rutaActualLayer._outline.setLatLngs(latLngs);
    rutaActualLayer._glow.setLatLngs(latLngs);
    rutaActualLayer.setLatLngs(latLngs);
    if (fit) ajustarVistaRuta(map, [], { force: true });
    return rutaActualLayer;
  }

  limpiarRuta(map);
  rutaActualCoords = coordsNormalizados;

  const outline = L.polyline(latLngs, {
    color: "#111113",
    weight: 8,
    opacity: 0.5
  }).addTo(map);

  const glow = L.polyline(latLngs, {
    color: "#ffffff",
    weight: 9,
    opacity: 0.16
  }).addTo(map);

  const main = L.polyline(latLngs, {
    color: "#e5e7eb",
    weight: 5,
    opacity: 0.96
  }).addTo(map);

  rutaActualLayer = main;

  main._outline = outline;
  main._glow = glow;

  if (fit) ajustarVistaRuta(map, [], { force: true });

  return main;
}

/*************************************************
 * 🛵 RUTA RESERVA
 *************************************************/
export function renderRutaReserva(
  map,
  coordsActual,
  coordsHaciaPasajero = [],
  { fit = false, stopover = null } = {}
) {

  limpiarRuta(map);

  const coordsNormalizados = unirCoordsReserva(coordsActual, coordsHaciaPasajero)
    .map((coord) => normalizarCoord(coord))
    .filter(Boolean);

  const coordsContinuos = unirCoordsReserva(coordsActual, coordsHaciaPasajero);

  if (!coordsContinuos.length) return null;

  rutaActualCoords = coordsNormalizados;

  const outline = L.polyline(coordsContinuos, {
    color: "#111113",
    weight: 8,
    opacity: 0.5
  });

  const glow = L.polyline(coordsContinuos, {
    color: "#ffffff",
    weight: 9,
    opacity: 0.16
  });

  const main = L.polyline(coordsContinuos, {
    color: "#e5e7eb",
    weight: 5,
    opacity: 0.96
  });

  const lastActualCoord = Array.isArray(coordsActual) && coordsActual.length
    ? coordsActual[coordsActual.length - 1]
    : null;
  const stopoverLatLng = normalizarCoord(stopover) || normalizarCoord(lastActualCoord);
  const layers = [outline, glow, main];

  if (stopoverLatLng) {
    puntoIntermedioMarker = L.marker([stopoverLatLng.lat, stopoverLatLng.lng], {
      icon: crearIconoPuntoIntermedio(),
      interactive: false
    });
    layers.push(puntoIntermedioMarker);
  }

  rutaActualLayer = L.layerGroup(layers).addTo(map);

  if (fit && coordsContinuos.length > 1) {
    try {
      ajustarVistaRuta(map, [], { force: true });
    } catch {}
  }

  return rutaActualLayer;
}

/*************************************************
 * 🔥 FALLBACK
 *************************************************/
export function renderLineaRecta(
  map,
  origen,
  destino,
  { fit = true } = {}
) {

  limpiarRuta(map);

  rutaActualCoords = normalizarCoords([
    [origen.lat, origen.lng],
    [destino.lat, destino.lng]
  ]);

  rutaActualLayer = L.polyline([
    [origen.lat, origen.lng],
    [destino.lat, destino.lng]
  ], {
    color: "#e5e7eb",
    weight: 5,
    opacity: 0.92
  }).addTo(map);

  if (fit) {
    ajustarVistaRuta(map, [], { force: true });
  }

  return rutaActualLayer;
}

/*************************************************
 * 🧹 LIMPIAR
 *************************************************/
export function limpiarRuta(map) {

  try {

    if (rutaActualLayer) {

      if (map.hasLayer(rutaActualLayer)) {
        map.removeLayer(rutaActualLayer);
      }

      if (rutaActualLayer._outline) {
        map.removeLayer(rutaActualLayer._outline);
      }

      if (rutaActualLayer._glow) {
        map.removeLayer(rutaActualLayer._glow);
      }
    }

    if (
      puntoIntermedioMarker &&
      map.hasLayer(puntoIntermedioMarker)
    ) {
      map.removeLayer(puntoIntermedioMarker);
    }

    rutaActualLayer = null;
    rutaActualCoords = [];
    puntoIntermedioMarker = null;
    lastRouteFitAt = 0;

  } catch (err) {

    console.error(
      "❌ limpiarRuta:",
      err.message
    );
  }
}

function normalizarCoords(coords = []) {
  return coords
    .map(normalizarCoord)
    .filter(Boolean);
}

function normalizarCoord(coord) {
  const lat = Number(coord?.lat ?? coord?.[0]);
  const lng = Number(coord?.lng ?? coord?.[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function actualizarPolylineCoords(coords = []) {
  const latLngs = coords.map((coord) => [coord.lat, coord.lng]);

  rutaActualLayer?.setLatLngs?.(latLngs);
  rutaActualLayer?._outline?.setLatLngs?.(latLngs);
  rutaActualLayer?._glow?.setLatLngs?.(latLngs);
}

function proyectarEnRuta(map, punto, coords, maxDistanceMeters) {
  const rawPoint = map.latLngToLayerPoint(punto);
  let mejor = null;

  for (let i = 0; i < coords.length - 1; i += 1) {
    const inicio = normalizarCoord(coords[i]);
    const fin = normalizarCoord(coords[i + 1]);
    if (!inicio || !fin) continue;

    const pointInicio = map.latLngToLayerPoint(inicio);
    const pointFin = map.latLngToLayerPoint(fin);
    const proyectado = proyectarPuntoEnSegmento(rawPoint, pointInicio, pointFin);
    const pixelDistance = rawPoint.distanceTo(proyectado);

    if (!mejor || pixelDistance < mejor.pixelDistance) {
      const latLng = map.layerPointToLatLng(proyectado);
      const latLngNormalizado = { lat: latLng.lat, lng: latLng.lng };

      mejor = {
        latLng: latLngNormalizado,
        segmentIndex: i,
        pixelDistance,
        distanceMeters: distanciaMetros(punto, latLngNormalizado)
      };
    }
  }

  if (!mejor || mejor.distanceMeters > maxDistanceMeters) {
    return null;
  }

  return mejor;
}

function proyectarPuntoEnSegmento(point, inicio, fin) {
  const dx = fin.x - inicio.x;
  const dy = fin.y - inicio.y;
  const lengthSq = dx * dx + dy * dy;

  if (!lengthSq) return inicio;

  const t = Math.max(
    0,
    Math.min(1, ((point.x - inicio.x) * dx + (point.y - inicio.y) * dy) / lengthSq)
  );

  return L.point(inicio.x + t * dx, inicio.y + t * dy);
}

function compactarCoords(coords = []) {
  const compactadas = [];

  coords.forEach((coord) => {
    const normalizada = normalizarCoord(coord);
    if (!normalizada) return;

    const anterior = compactadas[compactadas.length - 1];
    if (anterior && distanciaMetros(anterior, normalizada) < 0.5) return;

    compactadas.push(normalizada);
  });

  return compactadas;
}

function distanciaMetros(a, b) {
  const inicio = normalizarCoord(a);
  const fin = normalizarCoord(b);
  if (!inicio || !fin) return Infinity;

  const earth = 6371000;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(fin.lat - inicio.lat);
  const dLng = toRad(fin.lng - inicio.lng);
  const lat1 = toRad(inicio.lat);
  const lat2 = toRad(fin.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earth * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function unirCoordsReserva(coordsActual = [], coordsHaciaPasajero = []) {
  const actual = normalizarCoords(coordsActual);
  const siguiente = normalizarCoords(coordsHaciaPasajero);
  const unidos = [...actual];

  siguiente.forEach((coord) => {
    const ultimo = unidos.at(-1);
    if (
      ultimo &&
      Math.abs(ultimo.lat - coord.lat) < 0.00001 &&
      Math.abs(ultimo.lng - coord.lng) < 0.00001
    ) {
      return;
    }
    unidos.push(coord);
  });

  return unidos.map(({ lat, lng }) => [lat, lng]);
}

function crearIconoPuntoIntermedio() {
  return L.divIcon({
    html: `
      <span class="bego-route-point bego-route-point-stopover" aria-hidden="true">
        <span class="bego-route-point__core"></span>
      </span>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    className: "bego-map-icon bego-map-icon-stopover",
  });
}
