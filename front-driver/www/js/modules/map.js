export let map;
export let rutaLayerRef = { current: null };
export let origenMarkerRef = { current: null };
export let destinoMarkerRef = { current: null };

let rutaActualCoords = [];
let routeRequestId = 0;

export function initMap() {
  map = L.map("map", { zoomControl: false })
    .setView([18.5405, -72.3348], 14);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 }
  ).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);
}

export function getRutaActualCoords() {
  return rutaActualCoords.map((coord) => ({ ...coord }));
}

export function borrarRuta() {
  if (!map) return;

  routeRequestId++;
  console.log("Limpiando elementos del mapa...");

  if (rutaLayerRef.current) {
    map.removeLayer(rutaLayerRef.current);
    rutaLayerRef.current = null;
  }

  if (origenMarkerRef.current) {
    map.removeLayer(origenMarkerRef.current);
    origenMarkerRef.current = null;
  }

  if (destinoMarkerRef.current) {
    map.removeLayer(destinoMarkerRef.current);
    destinoMarkerRef.current = null;
  }

  rutaActualCoords = [];
}

export async function dibujarRutaPremium(origen, destino) {
  if (!map || !origen || !destino) return;

  borrarRuta();
  const requestId = ++routeRequestId;

  origenMarkerRef.current = L.marker([origen.lat, origen.lng]).addTo(map);
  destinoMarkerRef.current = L.marker([destino.lat, destino.lng]).addTo(map);

  const fallbackCoords = [
    [origen.lat, origen.lng],
    [destino.lat, destino.lng]
  ];

  renderRutaCoords(fallbackCoords, {
    color: "#00F5FF",
    dashArray: "10, 10",
    fit: true
  });

  try {
    const coords = await fetchRutaReal(origen, destino);
    if (requestId !== routeRequestId || !coords?.length) return;

    renderRutaCoords(coords, {
      color: "#00F5FF",
      dashArray: null,
      fit: true
    });
  } catch (err) {
    console.warn("Ruta real no disponible, usando fallback:", err?.message || err);
  }
}

function renderRutaCoords(coords, { color, dashArray, fit } = {}) {
  if (!map || !Array.isArray(coords) || coords.length < 2) return;

  if (rutaLayerRef.current) {
    map.removeLayer(rutaLayerRef.current);
    rutaLayerRef.current = null;
  }

  rutaActualCoords = normalizarCoords(coords);

  rutaLayerRef.current = L.polyline(coords, {
    color: color || "#00F5FF",
    weight: 5,
    opacity: 0.85,
    dashArray: dashArray || undefined,
    lineJoin: "round"
  }).addTo(map);

  if (fit) {
    map.fitBounds(rutaLayerRef.current.getBounds(), {
      padding: [50, 50]
    });
  }
}

async function fetchRutaReal(origen, destino) {
  const serverUrl = typeof window.getServerUrl === "function"
    ? window.getServerUrl()
    : window.location.origin;
  const params = new URLSearchParams({
    oLng: String(origen.lng),
    oLat: String(origen.lat),
    dLng: String(destino.lng),
    dLat: String(destino.lat)
  });
  const response = await fetch(`${serverUrl}/api/ruta/simple?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`ruta ${response.status}`);
  }

  const data = await response.json();
  const geometry = data.routes?.[0]?.geometry?.coordinates;

  if (!Array.isArray(geometry) || geometry.length < 2) return null;

  return geometry.map(([lng, lat]) => [lat, lng]);
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
