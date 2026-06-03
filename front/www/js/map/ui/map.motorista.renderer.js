import { viajeState } from "../../viaje/viaje.state.js";
import { motoIcon } from "../map.icons.js?v=20260603-road-heading-stable";
import { getRutaActualCoords } from "./map.route.renderer.js?v=20260603-road-heading-stable";
import {
  setMotorcycleMarkerPose
} from "../utils/map.motorcycle.motion.js?v=20260603-road-heading-stable";

export function renderMotorista(map, motorista) {
  if (!map || !motorista) return;

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

  map.panTo(markerPos, {
    animate: true,
    duration: 0.8
  });

  viajeState.motoristaMarker?.openPopup?.();
}

export function removeMotorista(map) {
  if (!map) return;

  if (viajeState.motoristaMarker) {
    map.removeLayer(viajeState.motoristaMarker);
    viajeState.motoristaMarker = null;
  }
}
