export let map;
export let rutaLayerRef = { current: null };
export let origenMarkerRef = { current: null };
export let destinoMarkerRef = { current: null };

const DEFAULT_MAP_CENTER = [18.2343, -72.5354];
const DEFAULT_MAP_ZOOM = 14;
const ROUTE_CONSUME_MAX_DISTANCE_METERS = 120;
const ROUTE_CONSUME_FINISH_METERS = 12;

let rutaActualCoords = [];
let routeRequestId = 0;
let recenterButtonBound = false;

export function initMap() {
  if (!window.L?.map) {
    console.warn("Leaflet no disponible: mapa motorista desactivado temporalmente.");
    return null;
  }

  const mapElement = document.getElementById("map");
  if (!mapElement) return null;

  map = L.map("map", { zoomControl: false })
    .setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 }
  ).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);
  bindRecenterButton();
}

export function getRutaActualCoords() {
  return rutaActualCoords.map((coord) => ({ ...coord }));
}

export function consumirRutaDesde(posicion, {
  maxDistanceMeters = ROUTE_CONSUME_MAX_DISTANCE_METERS,
  finishDistanceMeters = ROUTE_CONSUME_FINISH_METERS
} = {}) {
  if (!map || !rutaLayerRef.current || rutaActualCoords.length < 2) {
    return false;
  }

  if (typeof rutaLayerRef.current.setLatLngs !== "function") {
    return false;
  }

  const punto = normalizarCoord(posicion);
  if (!punto) return false;

  const snap = proyectarEnRuta(punto, rutaActualCoords, maxDistanceMeters);
  if (!snap) return false;

  const destino = rutaActualCoords[rutaActualCoords.length - 1];
  if (distanciaMetros(snap.latLng, destino) <= finishDistanceMeters) {
    rutaActualCoords = [];
    rutaLayerRef.current.setLatLngs([]);
    return true;
  }

  const coordsRestantes = compactarCoords([
    snap.latLng,
    ...rutaActualCoords.slice(snap.segmentIndex + 1)
  ]);

  if (coordsRestantes.length < 2) return false;

  rutaActualCoords = coordsRestantes;
  rutaLayerRef.current.setLatLngs(
    coordsRestantes.map((coord) => [coord.lat, coord.lng])
  );

  return true;
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
  const origenCoord = normalizarCoord(origen);
  const destinoCoord = normalizarCoord(destino);

  if (!map || !origenCoord || !destinoCoord) {
    console.warn("Ruta motorista omitida: coordenadas invalidas", { origen, destino });
    return false;
  }

  borrarRuta();
  const requestId = ++routeRequestId;

  origenMarkerRef.current = L.marker([origenCoord.lat, origenCoord.lng]).addTo(map);
  destinoMarkerRef.current = L.marker([destinoCoord.lat, destinoCoord.lng]).addTo(map);

  const fallbackCoords = [
    [origenCoord.lat, origenCoord.lng],
    [destinoCoord.lat, destinoCoord.lng]
  ];

  renderRutaCoords(fallbackCoords, {
    color: "#00F5FF",
    dashArray: "10, 10",
    fit: true
  });

  try {
    const coords = await fetchRutaReal(origenCoord, destinoCoord);
    if (requestId !== routeRequestId || !coords?.length) return;

    renderRutaCoords(coords, {
      color: "#00F5FF",
      dashArray: null,
      fit: true
    });
  } catch (err) {
    console.warn("Ruta real no disponible, usando fallback:", err?.message || err);
  }

  return true;
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
    .map(normalizarCoord)
    .filter(Boolean);
}

function normalizarCoord(coord) {
  if (!coord) return null;

  const candidates = [
    coord,
    coord.coords,
    coord.ubicacion,
    coord.location,
    coord.position,
    coord.geometry?.location
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const point = normalizarArrayCoord(candidate);
      if (point) return point;
    }

    const lat = Number(candidate.lat ?? candidate.latitude);
    const lng = Number(candidate.lng ?? candidate.lon ?? candidate.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    const coordinates = normalizarCoordinates(candidate.coordinates);
    if (coordinates) return coordinates;
  }

  return null;
}

function normalizarArrayCoord(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return null;

  const first = Number(coord[0]);
  const second = Number(coord[1]);

  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return { lat: first, lng: second };
  }

  if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
    return { lat: second, lng: first };
  }

  return null;
}

function normalizarCoordinates(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return null;

  const lng = Number(coord[0]);
  const lat = Number(coord[1]);

  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function proyectarEnRuta(punto, coords, maxDistanceMeters) {
  const rawPoint = map.latLngToLayerPoint(punto);
  let mejor = null;

  for (let i = 0; i < coords.length - 1; i++) {
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
