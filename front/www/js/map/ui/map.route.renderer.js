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
    color: "#020617",
    weight: 6
  }).addTo(map);

  const glow = L.polyline(coords, {
    color: "#00e5ff",
    weight: 10,
    opacity: 0.25
  }).addTo(map);

  const main = L.polyline(coords, {
    color: "#00e5ff",
    weight: 4
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
  coordsHaciaPasajero = []
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
        color: "#f59e0b",
        weight: 5,
        opacity: 0.9
      })
    );
  }

  if (coordsHaciaPasajero?.length) {
    layers.push(
      L.polyline(coordsHaciaPasajero, {
        color: "#00e5ff",
        weight: 5,
        dashArray: "10, 10",
        opacity: 0.95
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

  if (allCoords.length > 1) {
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
  destino
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
    color: "#ef4444",
    weight: 3,
    dashArray: "5, 10"
  }).addTo(map);

  try {
    map.fitBounds(rutaActualLayer.getBounds(), {
      padding: [70, 70],
      animate: true,
      duration: 0.5
    });
  } catch {}

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
