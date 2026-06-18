// /map/map.destino.js

import { viajeState } from "../viaje/viaje.state.js";

import { dibujarRuta } from "./map.ruta.js?v=20260618-map-drag-bg";

import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js?v=20260606-legal-trust";

import { destinoIcon } from "./map.icons.js?v=20260618-map-drag-bg";

import { reverseGeocode } from "./services/map.reverse.js";

import { getMap } from "./map.singleton.js?v=20260618-map-drag-bg";
import { cityConfig, coordsInCity } from "./config/index.js";

import {
  initAutocomplete,
  cleanupAutocomplete
} from "./ui/map.autocomplete.js";

let destinoRequestId = 0;

let clickHandler = null;

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

  } else {

    viajeState.destinoMarker = L.marker(latlng, {
      icon: destinoIcon
    }).addTo(map);
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
