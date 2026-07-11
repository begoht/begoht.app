import { createPOIIcon } from "../map.icons.js?v=20260710-auto-reference";


import { cityConfig } from "../config/index.js?v=20260624-cordoba-gps";

import {
  layerReferencias
} from "./map.layers.js";

/*************************************************
 * 📌 MOSTRAR POI
 *************************************************/
export function renderPOILayer() {

  layerReferencias.clearLayers();

  const referencias =
    cityConfig.poi || [];

  referencias.forEach((ref) => {

    const marker = L.marker(
      [ref.lat, ref.lng],
      {
        icon: createPOIIcon(
          ref.categoria
        ),

        title: ref.nombre
      }
    );

    marker.bindPopup(`
      <div style="font-family:system-ui;">
        <b>${ref.nombre}</b><br/>
        <span style="color:#94a3b8;">
          ${ref.categoria || "Referencia"}
        </span>
      </div>
    `);

    marker.addTo(layerReferencias);
  });
}

