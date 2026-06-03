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
  iconUrl: "/assets/icons/moto-transparent.svg?v=20260603-road-heading",
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
  aplicarRumbo(motoristaMarker, heading ?? calcularRumbo(lastMotoristaLatLng, nextLatLng));
  lastMotoristaLatLng = nextLatLng;
  map.panTo([lat, lng]);

  if (estado) {
    document.getElementById("estadoViaje").textContent = estado;
  }
});

function calcularRumbo(from, to) {
  if (!from || !to) return null;
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

function aplicarRumbo(marker, heading) {
  if (!marker || heading == null || !Number.isFinite(Number(heading))) return;

  requestAnimationFrame(() => {
    const element = marker.getElement?.();
    if (!element) return;
    const base = (element.style.transform || "")
      .replace(/\srotate\([-0-9.]+deg\)/g, "")
      .trim();
    element.style.transformOrigin = "50% 50%";
    element.style.transform = `${base} rotate(${(Number(heading) - 90).toFixed(1)}deg)`;
  });
}
