export let map;
export let rutaLayerRef = { current: null };
export let origenMarkerRef = { current: null };
export let destinoMarkerRef = { current: null };

const DEFAULT_MAP_CENTER = [18.2343, -72.5354];
const DEFAULT_MAP_ZOOM = 14;

let rutaActualCoords = [];
let routeRequestId = 0;
let recenterButtonBound = false;

export function initMap() {
  map = L.map("map", {
    zoomControl: false,
    preferCanvas: true,
    tap: true,
    inertia: true,
    inertiaDeceleration: 2400,
    inertiaMaxSpeed: 1600,
    easeLinearity: 0.25,
    zoomAnimation: true,
    markerZoomAnimation: true,
    fadeAnimation: true,
    bounceAtZoomLimits: false
  })
    .setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 19,
      detectRetina: false,
      updateWhenIdle: false,
      updateWhenZooming: false,
      updateInterval: 150,
      keepBuffer: 5
    }
  ).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);
  bindRecenterButton();
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

export function recentrarMapaMotorista({ useGps = true } = {}) {
  if (!map) return Promise.resolve(false);

  if (!useGps || !navigator.geolocation) {
    recenterFallback();
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setDriverMapView(lat, lng);
          resolve(true);
          return;
        }

        recenterFallback();
        resolve(false);
      },
      (err) => {
        console.warn("GPS recenter motorista:", err?.message || err);
        recenterFallback();
        resolve(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );
  });
}

function bindRecenterButton() {
  const btn = document.getElementById("driverRecenterMap");
  if (!btn || recenterButtonBound) return;

  recenterButtonBound = true;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.classList.add("is-loading");

    try {
      await recentrarMapaMotorista();
    } finally {
      btn.disabled = false;
      btn.classList.remove("is-loading");
    }
  });
}

function setDriverMapView(lat, lng, zoom = 16) {
  if (!map) return;

  if (typeof map.flyTo === "function") {
    map.flyTo([lat, lng], Math.max(map.getZoom?.() || zoom, zoom), {
      duration: 0.65
    });
    return;
  }

  map.setView([lat, lng], zoom);
}

function recenterFallback() {
  if (!map) return;

  const bounds = rutaLayerRef.current && typeof rutaLayerRef.current.getBounds === "function"
    ? rutaLayerRef.current.getBounds()
    : null;

  if (bounds && typeof bounds.isValid === "function" && bounds.isValid()) {
    map.fitBounds(bounds, { padding: [60, 60] });
    return;
  }

  setDriverMapView(DEFAULT_MAP_CENTER[0], DEFAULT_MAP_CENTER[1], DEFAULT_MAP_ZOOM);
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
