import { pasajeroIcon } from "./map.icons.js?v=20260603-transparent-icons";
import { ACTIVE_CITY, cityConfig, coordsInCity, inferCityConfigFromCoords, persistDetectedCity } from "./config/index.js";
import { viajeState } from "../viaje/viaje.state.js";
import { reverseGeocode } from "./services/map.reverse.js";

import {
  layerPasajero,
  layerMotoristas,
  layerReferencias
} from "./layers/map.layers.js";

import { renderPOILayer } from "./layers/map.poi.layer.js";

import {
  getCurrentPosition,
  startGPSWatch,
  stopGPSWatch
} from "./tracking/map.gps.js";

import { animarMarker } from "./tracking/map.animation.js";

let marcadorPasajero = null;

function viajeProtegido() {
  return ["buscando", "asignado", "reservado", "llego", "en_curso"].includes(viajeState.estado);
}

function getCiudadCentro() {
  const [lat, lng] = cityConfig.map.center;
  return {
    lat,
    lng,
    direccion: cityConfig?.map?.defaultAddress || cityConfig.name
  };
}

function setInputInicio(direccion) {
  const input = document.getElementById("inputInicio");

  if (input) {
    input.value = viajeProtegido() && viajeState.origen?.direccion
      ? viajeState.origen.direccion
      : direccion;
  }
}

function renderPasajeroMarker(map, lat, lng, direccion) {
  if (!marcadorPasajero) {
    marcadorPasajero = L.marker([lat, lng], {
      icon: pasajeroIcon
    }).addTo(layerPasajero);
  }

  marcadorPasajero.setLatLng([lat, lng]);

  marcadorPasajero.bindPopup(`
    <div style="font-family:system-ui;">
      <b>Tu ubicacion</b><br/>
      <span style="color:#94a3b8;">
        ${direccion}
      </span>
    </div>
  `);
}

function switchCityFromGpsIfNeeded(lat, lng) {
  const detectedCity = inferCityConfigFromCoords({ lat, lng });

  if (!detectedCity || detectedCity.id === ACTIVE_CITY || viajeProtegido()) {
    return false;
  }

  const reloadKey = `BEGO_CITY_RELOAD_${detectedCity.id}`;
  if (sessionStorage.getItem(reloadKey) === "1") return false;

  if (persistDetectedCity(detectedCity.id)) {
    sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
    return true;
  }

  return false;
}

export async function initGeo(map) {
  if (!map || typeof map.addLayer !== "function") {
    console.error("Mapa invalido");
    return;
  }

  console.log("initGeo PRO", cityConfig.id);

  layerPasajero.remove();
  layerMotoristas.remove();
  layerReferencias.remove();

  layerPasajero.addTo(map);
  layerMotoristas.addTo(map);
  layerReferencias.addTo(map);

  try {
    const pos = await getCurrentPosition();
    let lat = pos.coords.latitude;
    let lng = pos.coords.longitude;
    let direccion = "Tu ubicacion";

    if (switchCityFromGpsIfNeeded(lat, lng)) return;

    const gpsDentroDeCiudad = coordsInCity({ lat, lng });

    if (!gpsDentroDeCiudad) {
      const centro = getCiudadCentro();
      lat = centro.lat;
      lng = centro.lng;
      direccion = centro.direccion;
    } else {
      try {
        direccion = await reverseGeocode(lat, lng);
      } catch (e) {
        console.warn("reverse:", e);
      }
    }

    if (!viajeProtegido()) {
      viajeState.origen = { lat, lng, direccion };
    }

    map.setView([lat, lng], gpsDentroDeCiudad ? 16 : cityConfig.map.zoom);
    setInputInicio(direccion);
    renderPasajeroMarker(map, lat, lng, direccion);
    renderPOILayer();
  } catch (err) {
    console.warn("GPS inicial:", err);

    const centro = viajeState.origen || getCiudadCentro();
    map.setView([centro.lat, centro.lng], cityConfig.map.zoom);
    setInputInicio(centro.direccion);
    renderPasajeroMarker(map, centro.lat, centro.lng, centro.direccion);
    renderPOILayer();
  }

  startGPSWatch(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (switchCityFromGpsIfNeeded(lat, lng)) return;

      if (!coordsInCity({ lat, lng })) {
        return;
      }

      if (marcadorPasajero) {
        animarMarker(marcadorPasajero, lat, lng);
      }

      if (viajeState.origen && !viajeProtegido()) {
        viajeState.origen.lat = lat;
        viajeState.origen.lng = lng;
      }
    },
    (err) => {
      console.error("GPS:", err);
    }
  );
}

export function stopGeo() {
  stopGPSWatch();
  console.log("GPS detenido");
}
