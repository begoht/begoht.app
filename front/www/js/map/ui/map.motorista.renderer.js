import { viajeState } from "../../viaje/viaje.state.js";
import { motoIcon } from "../map.icons.js?v=20260710-auto-reference";
import {
  consumirRutaDesde,
  getRutaActualCoords
} from "./map.route.renderer.js?v=20260710-route-camera";
import {
  setMotorcycleMarkerPose
} from "../utils/map.motorcycle.motion.js?v=20260710-route-camera";

const FOLLOW_PAUSE_MS = 12000;
const FOLLOW_ZOOM = 17;
const FOLLOW_ZOOM_DURATION_SECONDS = 0.65;
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
  map._begoLatestFollowPoint = point;

  const currentZoom = Number(map.getZoom?.()) || 0;
  if (currentZoom < FOLLOW_ZOOM) {
    zoomToMotorista(map, point);
    return true;
  }

  if (map._begoFollowZooming) return true;

  centerFollowCamera(map, point);
  return true;
}

function zoomToMotorista(map, point) {
  if (!map?.setView) return;

  map._begoProgrammaticFollow = true;
  map._begoFollowZooming = true;

  try {
    map.setView([point.lat, point.lng], FOLLOW_ZOOM, {
      animate: true,
      duration: FOLLOW_ZOOM_DURATION_SECONDS,
      noMoveStart: true
    });
  } catch {
    map.setView([point.lat, point.lng], FOLLOW_ZOOM);
  }

  window.setTimeout(() => {
    map._begoProgrammaticFollow = false;
    map._begoFollowZooming = false;

    if (map._begoLatestFollowPoint) {
      centerFollowCamera(map, map._begoLatestFollowPoint);
    }
  }, Math.round(FOLLOW_ZOOM_DURATION_SECONDS * 1000) + 80);
}

function centerFollowCamera(map, point) {
  map._begoProgrammaticFollow = true;

  try {
    map.panTo?.([point.lat, point.lng], {
      animate: false,
      noMoveStart: true
    });
  } finally {
    window.setTimeout(() => {
      map._begoProgrammaticFollow = false;
    }, 0);
  }
}

