import { viajeState } from "../../viaje/viaje.state.js";
import { motoIcon } from "../map.icons.js?v=20260621-top-moto";
import {
  consumirRutaDesde,
  getRutaActualCoords
} from "./map.route.renderer.js?v=20260628-dark-route-locked";
import {
  setMotorcycleMarkerPose
} from "../utils/map.motorcycle.motion.js?v=20260621-route-moto";

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
  if (map._begoFollowZooming) return;

  map._begoFollowZooming = true;
  map._begoProgrammaticFollow = true;

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    map._begoFollowZooming = false;
    map._begoProgrammaticFollow = false;

    if (Date.now() >= followPausedUntil && map._begoLatestFollowPoint) {
      centerFollowCamera(map, map._begoLatestFollowPoint);
    }
  };

  if (typeof map.flyTo === "function") {
    map.once?.("moveend", release);
    map.flyTo([point.lat, point.lng], FOLLOW_ZOOM, {
      animate: true,
      duration: FOLLOW_ZOOM_DURATION_SECONDS
    });
    window.setTimeout(release, 1000);
    return;
  }

  map.setView?.([point.lat, point.lng], FOLLOW_ZOOM, { animate: true });
  release();
}

function centerFollowCamera(map, point) {
  if (!map || !point || Date.now() < followPausedUntil) return;

  map.panTo?.([point.lat, point.lng], {
    animate: false,
    noMoveStart: true
  });
}
