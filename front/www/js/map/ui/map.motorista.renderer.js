import { viajeState } from "../../viaje/viaje.state.js";
import { motoIcon } from "../map.icons.js?v=20260618-passenger-map-full";
import { getRutaActualCoords } from "./map.route.renderer.js?v=20260618-passenger-map-full";
import {
  setMotorcycleMarkerPose
} from "../utils/map.motorcycle.motion.js?v=20260615-smooth-autofinish";

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
        maxSnapDistanceMeters: 85
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
        maxSnapDistanceMeters: 85
      }
    );
  }

  const markerPos = viajeState.motoristaMarker?.getLatLng?.() || { lat, lng };

  if (shouldFollowMarker(map, markerPos)) {
    map.panInside(markerPos, {
      padding: [72, 72],
      animate: true,
      duration: 0.8
    });
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
  map.on?.("zoomstart", pause);
}

function shouldFollowMarker(map, markerPos) {
  if (!map || !markerPos || Date.now() < followPausedUntil) return false;

  const bounds = map.getBounds?.();
  if (!bounds?.pad) return false;

  return !bounds.pad(-0.25).contains(markerPos);
}
