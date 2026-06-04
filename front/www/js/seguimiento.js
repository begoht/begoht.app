// ===============================
// MAPA
// ===============================
const map = L.map("map").setView([18.5405, -72.3348], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

// ===============================
// ICONO MOTORISTA
// ===============================
const motoIcon = L.icon({
  iconUrl: "/assets/icons/moto-transparent.svg?v=20260603-proximity-alert",
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  className: "bego-map-icon bego-map-icon-moto",
});

// ===============================
// MARKER MOTORISTA
// ===============================
let motoristaMarker = L.marker([18.5405, -72.3348], {
  icon: motoIcon,
}).addTo(map);
let lastMotoristaLatLng = { lat: 18.5405, lng: -72.3348 };

const GPS_HEADING_ACCEPT_DEG = 75;
const GPS_FLIP_GUARD_DEG = 135;
const HEADING_SMOOTHING = 0.58;
const MIN_HEADING_MOVE_METERS = 2;

// ===============================
// SOCKET.IO
// ===============================
const API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:3000"
  : window.location.origin;
const socket = io(API_BASE);

// ID del viaje
const viajeId = localStorage.getItem("viaje_id");

socket.emit("unirse-viaje", viajeId);

// ===============================
// RECIBIR UBICACIÓN EN VIVO
// ===============================
socket.on("ubicacion-motorista", (data) => {
  const { lat, lng, estado, heading } = data;

  motoristaMarker.setLatLng([lat, lng]);
  const nextLatLng = { lat, lng };
  const rumbo = seleccionarRumbo(heading, calcularRumbo(lastMotoristaLatLng, nextLatLng));
  aplicarRumbo(motoristaMarker, rumbo.heading, rumbo.source);
  lastMotoristaLatLng = nextLatLng;
  map.panTo([lat, lng]);

  if (estado) {
    document.getElementById("estadoViaje").textContent = estado;
  }
});

function calcularRumbo(from, to) {
  if (!from || !to) return null;
  if (distanciaEntrePuntos(from, to) < MIN_HEADING_MOVE_METERS) return null;

  const toRad = value => value * Math.PI / 180;
  const toDeg = value => value * 180 / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function seleccionarRumbo(gpsHeading, movementHeading) {
  const gps = normalizarRumbo(gpsHeading);
  const movement = normalizarRumbo(movementHeading);

  if (movement != null) {
    if (gps != null && diferenciaRumbo(gps, movement) <= GPS_HEADING_ACCEPT_DEG) {
      return {
        heading: gps,
        source: "gps"
      };
    }

    return {
      heading: movement,
      source: "movement"
    };
  }

  return {
    heading: gps,
    source: gps == null ? null : "gps"
  };
}

function aplicarRumbo(marker, heading, source = null) {
  const numericHeading = normalizarRumbo(heading);

  if (!marker || numericHeading == null) return;

  const stableHeading = suavizarRumbo(marker, numericHeading, source);
  marker._begoHeading = stableHeading;

  requestAnimationFrame(() => {
    const element = marker.getElement?.();
    if (!element) return;
    const base = (element.style.transform || "")
      .replace(/(?:\s+)?rotate\([-0-9.]+deg\)/g, "")
      .trim();
    element.style.transformOrigin = "50% 50%";
    element.style.transform = `${base} rotate(${(stableHeading - 90).toFixed(1)}deg)`;
  });
}

function suavizarRumbo(marker, nextHeading, source) {
  const previous = normalizarRumbo(marker?._begoHeading);

  if (previous == null) return nextHeading;

  const delta = deltaRumbo(previous, nextHeading);

  if (source === "gps" && Math.abs(delta) > GPS_FLIP_GUARD_DEG) {
    return previous;
  }

  return normalizarRumbo(previous + delta * HEADING_SMOOTHING);
}

function normalizarRumbo(value) {
  const heading = Number(value);

  if (!Number.isFinite(heading) || heading < 0) return null;

  return ((heading % 360) + 360) % 360;
}

function deltaRumbo(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function diferenciaRumbo(a, b) {
  return Math.abs(deltaRumbo(a, b));
}

function distanciaEntrePuntos(from, to) {
  if (!from || !to) return Infinity;

  const metrosLat = (from.lat - to.lat) * 111320;
  const metrosLng = (from.lng - to.lng) * 111320 * Math.cos((from.lat * Math.PI) / 180);
  return Math.sqrt(metrosLat * metrosLat + metrosLng * metrosLng);
}
