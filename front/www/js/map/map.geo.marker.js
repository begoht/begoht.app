import { pasajeroIcon } from "./map.icons.js?v=20260710-auto-reference";
import { viajeState } from "../viaje/viaje.state.js";
import { layerPasajero } from "./layers/map.layers.js";
import { animarMarker } from "./tracking/map.animation.js";
import {
  distanciaMetros,
  escapeHtml,
  streetLine
} from "./utils/map.geo.utils.js?v=20260711-map-geo-utils";

let marcadorPasajero = null;
let ultimoOrigenRender = null;
let ultimoOrigenLabel = "";
let ultimoOrigenPopup = "";

export function renderPasajeroMarker(map, lat, lng, direccion, { animate = false } = {}) {
  if (origenDebeOcultarse()) {
    ocultarOrigenEnMapa();
    return;
  }

  const label = escapeHtml(streetLine(direccion, "Origen"));
  const popup = `
    <div style="font-family:system-ui;">
      <b>Tu ubicacion</b><br/>
      <span style="color:#94a3b8;">
        ${escapeHtml(direccion)}
      </span>
    </div>
  `;

  if (
    marcadorPasajero &&
    ultimoOrigenRender &&
    distanciaMetros(ultimoOrigenRender, { lat, lng }) < 1 &&
    ultimoOrigenLabel === label &&
    ultimoOrigenPopup === popup
  ) {
    return;
  }

  if (!marcadorPasajero) {
    marcadorPasajero = L.marker([lat, lng], {
      icon: pasajeroIcon
    }).addTo(layerPasajero);
  } else if (animate) {
    animarMarker(marcadorPasajero, lat, lng);
  } else {
    marcadorPasajero.setLatLng([lat, lng]);
  }

  if (ultimoOrigenPopup !== popup) {
    marcadorPasajero.bindPopup(popup);
    ultimoOrigenPopup = popup;
  }

  if (ultimoOrigenLabel !== label || !marcadorPasajero.getTooltip?.()) {
    if (marcadorPasajero.getTooltip?.()) {
      marcadorPasajero.setTooltipContent(label);
    } else {
      marcadorPasajero.bindTooltip(label, {
        permanent: true,
        direction: "right",
        offset: [16, 0],
        opacity: 1,
        className: "bego-route-label bego-route-label-origin"
      });
    }
    ultimoOrigenLabel = label;
  }

  ultimoOrigenRender = { lat, lng };
}

export function ocultarOrigenEnMapa() {
  if (marcadorPasajero) {
    try {
      marcadorPasajero.remove();
    } catch {
      try {
        layerPasajero.removeLayer(marcadorPasajero);
      } catch {}
    }
  }

  marcadorPasajero = null;
  ultimoOrigenRender = null;
  ultimoOrigenLabel = "";
  ultimoOrigenPopup = "";
}

export function tieneOrigenRenderizado() {
  return !!marcadorPasajero;
}

function origenDebeOcultarse() {
  return ["llego", "en_curso"].includes(viajeState.estado);
}
