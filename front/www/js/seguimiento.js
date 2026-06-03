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
  iconUrl: "/assets/icons/moto-transparent.svg?v=20260603-transparent-icons",
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
  const { lat, lng, estado } = data;

  motoristaMarker.setLatLng([lat, lng]);
  map.panTo([lat, lng]);

  if (estado) {
    document.getElementById("estadoViaje").textContent = estado;
  }
});
