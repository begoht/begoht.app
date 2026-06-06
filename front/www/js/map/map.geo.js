import { pasajeroIcon } from "./map.icons.js?v=20260605-passenger-dot";
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
let ubicacionButtonBound = false;
let recenterButtonBound = false;
let ultimaUbicacionGps = null;

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

function setInputInicio(direccion, { placeholder = false } = {}) {
  const input = document.getElementById("inputInicio");

  if (input) {
    if (placeholder && !viajeProtegido()) {
      input.value = "";
      input.placeholder = direccion;
      return;
    }

    input.value = viajeProtegido() && viajeState.origen?.direccion
      ? viajeState.origen.direccion
      : direccion;
  }
}

function renderPasajeroMarker(map, lat, lng, direccion, { animate = false } = {}) {
  if (!marcadorPasajero) {
    marcadorPasajero = L.marker([lat, lng], {
      icon: pasajeroIcon
    }).addTo(layerPasajero);
  } else if (animate) {
    animarMarker(marcadorPasajero, lat, lng);
  } else {
    marcadorPasajero.setLatLng([lat, lng]);
  }

  marcadorPasajero.bindPopup(`
    <div style="font-family:system-ui;">
      <b>Tu ubicacion</b><br/>
      <span style="color:#94a3b8;">
        ${direccion}
      </span>
    </div>
  `);
}

function limpiarOrigenSiLibre() {
  if (!viajeProtegido()) {
    viajeState.origen = null;
  }
}

function mostrarCentroServicio(map, mensaje) {
  const centro = viajeState.origen || getCiudadCentro();

  map.setView([centro.lat, centro.lng], cityConfig.map.zoom);

  if (viajeState.origen) {
    setInputInicio(centro.direccion);
    renderPasajeroMarker(map, centro.lat, centro.lng, centro.direccion);
    return;
  }

  setInputInicio(
    mensaje || `Esperando GPS real en ${cityConfig.name}`,
    { placeholder: true }
  );
}

function aplicarUbicacionGps(map, lat, lng, direccion, { center = false, animate = false } = {}) {
  ultimaUbicacionGps = { lat, lng, direccion };

  if (!viajeProtegido()) {
    viajeState.origen = { lat, lng, direccion };
  }

  if (center || !marcadorPasajero) {
    map.setView([lat, lng], 16);
  }

  setInputInicio(direccion);
  renderPasajeroMarker(map, lat, lng, direccion, { animate });
}

function centrarMapaEn(map, punto, zoom = 16) {
  if (!map || !punto) return false;

  const lat = Number(punto.lat);
  const lng = Number(punto.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  if (typeof map.flyTo === "function") {
    map.flyTo([lat, lng], Math.max(map.getZoom?.() || zoom, zoom), {
      duration: 0.65
    });
  } else {
    map.setView([lat, lng], zoom);
  }

  return true;
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

async function tomarUbicacionActual(map, { center = false, fromButton = false } = {}) {
  const pos = await getCurrentPosition({
    maximumAge: 0,
    timeout: fromButton ? 18000 : 14000
  });

  const lat = Number(pos.coords.latitude);
  const lng = Number(pos.coords.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("GPS invalido");
  }

  if (switchCityFromGpsIfNeeded(lat, lng)) {
    return true;
  }

  if (!coordsInCity({ lat, lng })) {
    limpiarOrigenSiLibre();
    mostrarCentroServicio(map, `GPS fuera de ${cityConfig.name}. Usa tu ubicacion real en ${cityConfig.name}.`);
    return false;
  }

  let direccion = "Tu ubicacion actual";

  try {
    direccion = await reverseGeocode(lat, lng);
  } catch (e) {
    console.warn("reverse:", e);
  }

  aplicarUbicacionGps(map, lat, lng, direccion, { center });
  return true;
}

function bindUbicacionButton(map) {
  const btn = document.getElementById("btnUbicacion");
  if (!btn || ubicacionButtonBound) return;

  ubicacionButtonBound = true;
  const label = btn.textContent || "Usar ubicacion actual";

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Ubicando...";

    try {
      const ok = await tomarUbicacionActual(map, { center: true, fromButton: true });
      if (!ok) {
        setInputInicio(`Activa GPS real dentro de ${cityConfig.name}`, { placeholder: true });
      }
    } catch (err) {
      console.warn("GPS manual:", err);
      setInputInicio("No pudimos tomar tu GPS. Revisa permisos de ubicacion.", { placeholder: true });
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}

function bindRecenterButton(map) {
  const btn = document.getElementById("btnRecentrarMapa");
  if (!btn || recenterButtonBound) return;

  recenterButtonBound = true;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.classList.add("is-loading");

    try {
      const gpsOk = await tomarUbicacionActual(map, { center: true, fromButton: true });
      if (!gpsOk && !centrarMapaEn(map, ultimaUbicacionGps || viajeState.origen || getCiudadCentro())) {
        mostrarCentroServicio(map);
      }
    } catch (err) {
      console.warn("recentrar pasajero:", err);

      if (!centrarMapaEn(map, ultimaUbicacionGps || viajeState.origen || getCiudadCentro())) {
        mostrarCentroServicio(map);
      }
    } finally {
      btn.disabled = false;
      btn.classList.remove("is-loading");
    }
  });
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
  bindUbicacionButton(map);
  bindRecenterButton(map);

  try {
    const gpsOk = await tomarUbicacionActual(map, { center: true });
    if (!gpsOk) {
      mostrarCentroServicio(map);
    }
    renderPOILayer();
  } catch (err) {
    console.warn("GPS inicial:", err);

    mostrarCentroServicio(map, `Esperando GPS real en ${cityConfig.name}`);
    renderPOILayer();
  }

  startGPSWatch(
    (pos) => {
      const lat = Number(pos.coords.latitude);
      const lng = Number(pos.coords.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      if (switchCityFromGpsIfNeeded(lat, lng)) return;

      if (!coordsInCity({ lat, lng })) {
        return;
      }

      const direccion = viajeState.origen?.direccion || "Tu ubicacion actual";
      aplicarUbicacionGps(map, lat, lng, direccion, { animate: true });
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
