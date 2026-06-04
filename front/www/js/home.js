let homeMap;
let motoristas = [];

document.addEventListener("DOMContentLoaded", () => {
  homeMap = L.map("homeMap", {
    zoomControl: false,
    attributionControl: false,
  }).setView([18.5405, -72.3348], 14);

  // MAPA OSCURO PRO
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      subdomains: "abcd",
      maxZoom: 19,
    }
  ).addTo(homeMap);

  // UBICACIÓN USUARIO
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;

      homeMap.setView([latitude, longitude], 16);

      L.circleMarker([latitude, longitude], {
        radius: 6,
        color: "#00e5ff",
        fillColor: "#00e5ff",
        fillOpacity: 1,
      }).addTo(homeMap);

      crearMotoristas(latitude, longitude);
    },
    () => console.warn("GPS no disponible"),
    { enableHighAccuracy: true }
  );
});

/*************************************************
 * 🛵 MOTORISTAS ALEATORIOS
 *************************************************/
function crearMotoristas(lat, lng) {
  const iconMoto = L.icon({
    iconUrl: "/assets/icons/moto-transparent.svg?v=20260603-proximity-alert",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    className: "motorista-icon",
  });

  for (let i = 0; i < 6; i++) {
    const offsetLat = lat + (Math.random() - 0.5) * 0.01;
    const offsetLng = lng + (Math.random() - 0.5) * 0.01;

    const marker = L.marker([offsetLat, offsetLng], {
      icon: iconMoto,
    }).addTo(homeMap);

    motoristas.push(marker);
    animarMotorista(marker);
  }
}

/*************************************************
 * 🔁 ANIMACIÓN SUAVE
 *************************************************/
function animarMotorista(marker) {
  setInterval(() => {
    const pos = marker.getLatLng();

    const nuevaLat = pos.lat + (Math.random() - 0.5) * 0.0012;
    const nuevaLng = pos.lng + (Math.random() - 0.5) * 0.0012;

    marker.setLatLng([nuevaLat, nuevaLng]);
  }, 3000);
}
