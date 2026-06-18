let rutaActualLayer = null;

let puntoIntermedioMarker = null;

let rutaActualCoords = [];

export function getRutaActualCoords() {
  return rutaActualCoords.map((coord) => ({ ...coord }));
}

/*************************************************
 * 🎨 RENDER RUTA PREMIUM
 *************************************************/
export function renderRuta(map, coords) {

  limpiarRuta(map);

  rutaActualCoords = normalizarCoords(coords);

  const outline = L.polyline(coords, {
    color: "#111113",
    weight: 8,
    opacity: 0.5
  }).addTo(map);

  const glow = L.polyline(coords, {
    color: "#ffffff",
    weight: 9,
    opacity: 0.16
  }).addTo(map);

  const main = L.polyline(coords, {
    color: "#e5e7eb",
    weight: 5,
    opacity: 0.96
  }).addTo(map);

  rutaActualLayer = main;

  main._outline = outline;
  main._glow = glow;

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

  const coordsNormalizados = [
    ...normalizarCoords(coordsActual || []),
    ...normalizarCoords(coordsHaciaPasajero || [])
  ];

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
      map.fitBounds(L.latLngBounds(coordsContinuos), {
        padding: [80, 80],
        animate: true,
        duration: 0.6
      });
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
    try {
      map.fitBounds(rutaActualLayer.getBounds(), {
        padding: [70, 70],
        animate: true,
        duration: 0.5
      });
    } catch {}
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
