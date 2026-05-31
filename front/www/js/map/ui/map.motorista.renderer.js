import { viajeState } from "../../viaje/viaje.state.js";

import { motoIcon } from "../map.icons.js";

/*************************************************
 * 🛵 RENDER MOTORISTA ASIGNADO
 *************************************************/
export function renderMotorista(
  map,
  motorista
) {

  if (!map || !motorista) return;

  const {
    lat,
    lng,
    nombre
  } = motorista;

  if (lat == null || lng == null) return;

  if (
    viajeState.motoristaMarker &&
    map.hasLayer?.(viajeState.motoristaMarker)
  ) {

    viajeState.motoristaMarker
      .setLatLng([lat, lng]);

  } else {
    if (viajeState.motoristaMarker) {
      try {
        viajeState.motoristaMarker.remove();
      } catch {}
    }

    viajeState.motoristaMarker =
      L.marker([lat, lng], {
        icon: motoIcon
      })
      .addTo(map)
      .bindPopup(
        `🛵 ${nombre || "Motorista"}`
      );
  }

  map.panTo([lat, lng], {
    animate: true,
    duration: 0.8
  });

  viajeState.motoristaMarker?.openPopup?.();
}

/*************************************************
 * ❌ ELIMINAR MOTORISTA
 *************************************************/
export function removeMotorista(
  map
) {

  if (!map) return;

  if (viajeState.motoristaMarker) {

    map.removeLayer(
      viajeState.motoristaMarker
    );

    viajeState.motoristaMarker = null;
  }
}
