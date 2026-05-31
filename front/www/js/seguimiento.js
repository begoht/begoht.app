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
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
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
