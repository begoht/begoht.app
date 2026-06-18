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
  { fit = false } = {}
) {

  limpiarRuta(map);

  const layers = [];
  const coordsNormalizados = [
    ...normalizarCoords(coordsActual || []),
    ...normalizarCoords(coordsHaciaPasajero || [])
  ];

  if (coordsActual?.length) {
    layers.push(
      L.polyline(coordsActual, {
        color: "#e5e7eb",
        weight: 5,
        opacity: 0.96
      })
    );
  }

  if (coordsHaciaPasajero?.length) {
    layers.push(
      L.polyline(coordsHaciaPasajero, {
        color: "#f8fafc",
        weight: 5,
        dashArray: "10, 10",
        opacity: 0.9
      })
    );
  }

  if (!layers.length) return null;

  rutaActualCoords = coordsNormalizados;

  rutaActualLayer = L.layerGroup(layers).addTo(map);

  const allCoords = [
    ...(coordsActual || []),
    ...(coordsHaciaPasajero || [])
  ];

  if (fit && allCoords.length > 1) {
    try {
      map.fitBounds(L.latLngBounds(allCoords), {
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
    .map((coord) => {
      const lat = Number(coord?.lat ?? coord?.[0]);
      const lng = Number(coord?.lng ?? coord?.[1]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    })
    .filter(Boolean);
}
