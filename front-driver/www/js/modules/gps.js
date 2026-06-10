import { map, getRutaActualCoords, consumirRutaDesde } from "./map.js?v=20260610-route-consume";
import { isDriverOnline, updateDriverPosition } from "./driver.status.js?v=20260608-gps-accept";
import { motoIcon } from "./map.icons.js?v=20260603-road-heading-stable";
import {
  setMotorcycleMarkerPose
} from "./map.motion.js?v=20260603-road-heading-stable";

let ultimaPosicion = null;
let ultimaLectura = null;
let motoristaMarker = null;
let ultimaEmisionTime = 0;

const FRECUENCIA_MS = 4000;
const HEARTBEAT_MS = 25000;
const DISTANCIA_MINIMA_METROS = 0.00002;

export function initGPS(socket) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const heading = Number.isFinite(pos.coords.heading) ? pos.coords.heading : null;
      const ahora = Date.now();
      ultimaLectura = { lat, lng, heading };
      updateDriverPosition(ultimaLectura);

      if (map) {
        if (!motoristaMarker) {
          motoristaMarker = L.marker([lat, lng], { icon: motoIcon }).addTo(map);
          map.setView([lat, lng], 16);
        }

        const pose = setMotorcycleMarkerPose(
          motoristaMarker,
          map,
          { lat, lng },
          {
            routeCoords: getRutaActualCoords(),
            heading,
            maxSnapDistanceMeters: 85
          }
        );
        consumirRutaDesde(pose?.latLng || { lat, lng });
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
        socket.emit("motoristas:ubicacion", { lat, lng, heading, heartbeat: !movidoSuficiente, disponible: true });
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
  return ultimaLectura || ultimaPosicion;
}

export function setUltimaPosicion(posicion) {
  const lat = Number(posicion?.lat ?? posicion?.latitude);
  const lng = Number(posicion?.lng ?? posicion?.longitude);
  const heading = Number.isFinite(Number(posicion?.heading)) ? Number(posicion.heading) : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  ultimaLectura = { lat, lng, heading };
  updateDriverPosition(ultimaLectura);
  return ultimaLectura;
}
