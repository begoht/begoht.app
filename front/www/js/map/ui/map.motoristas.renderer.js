import { motoIcon } from "../map.icons.js";

import {
  motoristasCercanos
} from "../state/map.motoristas.state.js";

/*************************************************
 * 🛵 RENDER MOTORISTAS
 *************************************************/
export function renderMotoristas(
  map,
  drivers
) {

  if (!map) return;

  if (!Array.isArray(drivers)) {
    return;
  }

  /*************************************************
   * 🧹 ELIMINAR DESAPARECIDOS
   *************************************************/
  Object.keys(motoristasCercanos)
    .forEach((id) => {

      const existe = drivers.find(
        (d) => (d.id || d._id) === id
      );

      if (!existe) {

        map.removeLayer(
          motoristasCercanos[id]
        );

        delete motoristasCercanos[id];
      }
    });

  /*************************************************
   * 🔄 CREAR / UPDATE
   *************************************************/
  drivers.forEach((driver) => {

    const id =
      driver.id || driver._id;

    const {
      lat,
      lng,
      nombre
    } = driver;

    if (
      !id ||
      lat == null ||
      lng == null
    ) {
      return;
    }

    if (motoristasCercanos[id]) {

      motoristasCercanos[id]
        .setLatLng([lat, lng]);

    } else {

      const marker =
        L.marker([lat, lng], {
          icon: motoIcon
        }).addTo(map);

      if (nombre) {
        marker.bindPopup(`🛵 ${nombre}`);
      }

      motoristasCercanos[id] = marker;
    }
  });
}

/*************************************************
 * 🧹 LIMPIAR TODOS
 *************************************************/
export function clearMotoristas(
  map
) {

  if (!map) return;

  Object.values(motoristasCercanos)
    .forEach((marker) => {

      map.removeLayer(marker);
    });

  Object.keys(motoristasCercanos)
    .forEach((id) => {

      delete motoristasCercanos[id];
    });
}