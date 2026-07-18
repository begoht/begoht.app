import { viajeState } from "../../viaje/viaje.state.js";
import { motoIcon } from "../map.icons.js?v=20260718-bego-moto-map";
import {
  ajustarVistaRuta,
  consumirRutaDesde,
  getRutaActualCoords
} from "./map.route.renderer.js?v=20260710-route-camera";
import {
  setMotorcycleMarkerPose
} from "../utils/map.motorcycle.motion.js?v=20260718-bego-moto-heading";

const FOLLOW_PAUSE_MS = 12000;
let followPausedUntil = 0;

export function renderMotorista(map, motorista) {
  if (!map || !motorista) return;

  bindFollowPause(map);

  const { lat, lng, nombre, heading } = motorista;
  if (lat == null || lng == null) return;

  if (
    viajeState.motoristaMarker &&
    map.hasLayer?.(viajeState.motoristaMarker)
  ) {
    setMotorcycleMarkerPose(
      viajeState.motoristaMarker,
      map,
      { lat, lng },
      {
        routeCoords: getRutaActualCoords(),
        heading,
        maxSnapDistanceMeters: 85,
        onMove: (position) => {
          consumirRutaDesde(map, position);
          followMotorista(map, position);
        }
      }
    );
  } else {
    if (viajeState.motoristaMarker) {
      try {
        viajeState.motoristaMarker.remove();
      } catch {}
    }

    viajeState.motoristaMarker = L.marker([lat, lng], {
      icon: motoIcon
    })
      .addTo(map)
      .bindPopup(`Motorista: ${nombre || "Motorista"}`);

    setMotorcycleMarkerPose(
      viajeState.motoristaMarker,
      map,
      { lat, lng },
      {
        routeCoords: getRutaActualCoords(),
        heading,
        maxSnapDistanceMeters: 85,
        onMove: (position) => {
          consumirRutaDesde(map, position);
          followMotorista(map, position);
        }
      }
    );
  }
}

export function removeMotorista(map) {
  if (!map) return;

  if (viajeState.motoristaMarker) {
    map.removeLayer(viajeState.motoristaMarker);
    viajeState.motoristaMarker = null;
  }
}

function bindFollowPause(map) {
  if (!map || map._begoFollowPauseBound) return;
  map._begoFollowPauseBound = true;

  const pause = () => {
    followPausedUntil = Date.now() + FOLLOW_PAUSE_MS;
  };

  map.on?.("dragstart", pause);
  map.on?.("zoomstart", () => {
    if (!map._begoProgrammaticFollow) pause();
  });
}

function followMotorista(map, markerPos) {
  if (!map || !markerPos || Date.now() < followPausedUntil) return false;

  const lat = Number(markerPos.lat);
  const lng = Number(markerPos.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  const point = { lat, lng };
  const routeCoords = getRutaActualCoords();
  if (routeCoords.length > 1) {
    return ajustarVistaRuta(map, [point]);
  }

  map.panTo?.([point.lat, point.lng], {
    animate: false,
    noMoveStart: true
  });
  return true;
}

