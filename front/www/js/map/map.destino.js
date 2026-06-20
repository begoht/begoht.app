// /map/map.destino.js

import { viajeState } from "../viaje/viaje.state.js";

import { dibujarRuta } from "./map.ruta.js?v=20260620-map-rotation";

import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js?v=20260619-clear-map-address";

import { destinoIcon } from "./map.icons.js?v=20260619-clear-map-address";

import { reverseGeocode } from "./services/map.reverse.js?v=20260619-clear-map-address";

import { getMap } from "./map.singleton.js?v=20260620-map-rotation";
import { cityConfig, coordsInCity } from "./config/index.js";

import {
  initAutocomplete,
  cleanupAutocomplete
} from "./ui/map.autocomplete.js";

let destinoRequestId = 0;

let clickHandler = null;

function escapeHtml(value = "") {
  const chars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };

  return String(value).replace(/[&<>"']/g, (char) => chars[char]);
}

function streetLine(value, fallback = "Destino") {
  const parts = String(value || "")
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (!parts.length) return fallback;

  const first = parts[0];
  const startsWithNumber = first.match(/^(\d+[a-z0-9-]*)\s+(.+)$/i);
  if (startsWithNumber) {
    return `${startsWithNumber[2]} ${startsWithNumber[1]}`;
  }

  const endsWithNumber = first.match(/^(.+?)\s+(\d+[a-z0-9-]*)$/i);
  if (endsWithNumber) return `${endsWithNumber[1]} ${endsWithNumber[2]}`;

  const numberPart = parts
    .slice(1)
    .map((part) => part.replace(/^n(?:o|°|º)?\.?\s*/i, "").trim())
    .find((part) => /^\d+[a-z0-9-]*$/i.test(part));

  return numberPart ? `${first} ${numberPart}` : first;
}

function setDestinoTooltip(marker, direccion) {
  if (!marker) return;

  marker.bindTooltip(escapeHtml(streetLine(direccion, "Destino")), {
    permanent: true,
    direction: "left",
    offset: [-16, 0],
    opacity: 1,
    className: "bego-route-label bego-route-label-destination"
  });
}

export function mostrarDestinoEnMapa(destino) {
  const map = getMap();

  if (!map || !destino?.lat || !destino?.lng) {
    if (!map) {
      window.addEventListener(
        "map-ready",
        () => mostrarDestinoEnMapa(destino),
        { once: true }
      );
    }
    return;
  }

  const latlng = {
    lat: Number(destino.lat),
    lng: Number(destino.lng)
  };

  if (Number.isNaN(latlng.lat) || Number.isNaN(latlng.lng)) return;

  if (
    viajeState.destinoMarker &&
    map.hasLayer?.(viajeState.destinoMarker)
  ) {
    viajeState.destinoMarker.setLatLng(latlng);
    setDestinoTooltip(viajeState.destinoMarker, destino.direccion || destino.address);
    return;
  }

  if (viajeState.destinoMarker) {
    try {
      viajeState.destinoMarker.remove();
    } catch {}
  }

  viajeState.destinoMarker = L.marker(latlng, {
    icon: destinoIcon
  }).addTo(map);

  setDestinoTooltip(viajeState.destinoMarker, destino.direccion || destino.address);
}

/*************************************************
 * 🎯 ASIGNAR DESTINO
 *************************************************/
export async function asignarDestino(
  map,
  latlng,
  nombre = ""
) {

  if (!map) return;

  /*************************************************
   * 🔥 BLOQUEAR SOLO SI HAY VIAJE REAL ACTIVO
  *************************************************/
 const viajeBloqueado = [
   "buscando",
   "asignado",
   "reservado",
   "llego",
   "en_curso"
  ].includes(viajeState.estado);
  

  console.log("🧠 Estado actual:", {
    estado: viajeState.estado,
    activo: viajeState.activo,
    viajeId: viajeState.viajeId,
    origen: viajeState.origen
  });
 
  if (viajeBloqueado) return;

  if (!viajeState.origen) return;

  if (!coordsInCity(latlng)) {
    const input = document.getElementById("inputDestino");
    if (input) {
      input.value = "";
      input.placeholder = `Solo disponible en ${cityConfig.name}`;
    }
    return;
  }

  const requestId = ++destinoRequestId;

  /*************************************************
   * 📍 MARKER
   *************************************************/
  if (viajeState.destinoMarker) {

    viajeState.destinoMarker.setLatLng(latlng);
    setDestinoTooltip(viajeState.destinoMarker, nombre || "Destino");

  } else {

    viajeState.destinoMarker = L.marker(latlng, {
      icon: destinoIcon
    }).addTo(map);

    setDestinoTooltip(viajeState.destinoMarker, nombre || "Destino");
  }

  map.flyTo(latlng, 15, {
    duration: 1.2
  });

  /*************************************************
   * 🌍 DIRECCIÓN
   *************************************************/
  const tareaDireccion = (async () => {

    let nombreReal = nombre;

    if (
      !nombre ||
      nombre === "Punto seleccionado en mapa"
    ) {

      nombreReal = await reverseGeocode(
        latlng.lat,
        latlng.lng
      );
    }

    if (requestId !== destinoRequestId) return;

    viajeState.destino = {
      lat: latlng.lat,
      lng: latlng.lng,
      direccion: nombreReal
    };

    const input =
      document.getElementById("inputDestino");

    if (input) {
      input.value = nombreReal;
    }

    setDestinoTooltip(
      viajeState.destinoMarker,
      nombreReal
    );

  })();

  /*************************************************
   * 🛣️ RUTA
   *************************************************/
  const tareaRuta = dibujarRuta(
    viajeState.origen,
    {
      lat: latlng.lat,
      lng: latlng.lng
    }
  );

  await Promise.all([
    tareaDireccion,
    tareaRuta
  ]);

  if (requestId !== destinoRequestId) return;

  actualizarBotonViaje();
}

/*************************************************
 * 🚀 INIT
 *************************************************/
export function initSeleccionDestino(map) {

  if (!map) return;

  cleanupSeleccionDestino();

  clickHandler = (e) => {
    console.log("📍 Click mapa detectado", e.latlng);

    asignarDestino(
      map,
      e.latlng,
      "Punto seleccionado en mapa"
    );
  };

  map.on("click", clickHandler);
  console.log("🗺️ Click destino listener ACTIVADO");

  initAutocomplete({
    map,

    onSelect: (coords, nombre) => {
      asignarDestino(map, coords, nombre);
    }
  });
}

/*************************************************
 * 🧹 CLEANUP
 *************************************************/
export function cleanupSeleccionDestino() {

  cleanupAutocomplete();

  if (clickHandler) {

    try {
      map?.off("click", clickHandler);
    } catch {}

    clickHandler = null;
  }
}
