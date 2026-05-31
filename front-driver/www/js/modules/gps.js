import { map } from "./map.js";
import { isDriverOnline, updateDriverPosition } from "./driver.status.js";

let ultimaPosicion = null;
let motoristaMarker = null;
let ultimaEmisionTime = 0;

const FRECUENCIA_MS = 2000;
const HEARTBEAT_MS = 25000;
const DISTANCIA_MINIMA_METROS = 0.00002;

export function initGPS(socket) {
  const motoIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const ahora = Date.now();
      updateDriverPosition({ lat, lng });

      if (map) {
        if (!motoristaMarker) {
          motoristaMarker = L.marker([lat, lng], { icon: motoIcon }).addTo(map);
          map.setView([lat, lng], 16);
        } else {
          motoristaMarker.setLatLng([lat, lng]);
        }
      }

      const movidoSuficiente = !ultimaPosicion ||
        Math.abs(ultimaPosicion.lat - lat) > DISTANCIA_MINIMA_METROS ||
        Math.abs(ultimaPosicion.lng - lng) > DISTANCIA_MINIMA_METROS;

      const tiempoSuficiente = ahora - ultimaEmisionTime > FRECUENCIA_MS;
      const heartbeatNecesario = ahora - ultimaEmisionTime > HEARTBEAT_MS;

      if (!isDriverOnline()) {
        return;
      }

      if ((movidoSuficiente && tiempoSuficiente) || heartbeatNecesario) {
        ultimaPosicion = { lat, lng };
        ultimaEmisionTime = ahora;
        socket.emit("motoristas:ubicacion", { lat, lng, heartbeat: !movidoSuficiente, disponible: true });
      }
    },
    (err) => console.error("GPS error:", err),
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );
}

export function getUltimaPosicion() {
  return ultimaPosicion;
}
