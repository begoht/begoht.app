import { pasajeroIcon } from "./map.icons.js?v=20260619-clear-map-address";
import { ACTIVE_CITY, cityConfig, coordsInCity, inferCityConfigFromCoords, persistDetectedCity } from "./config/index.js?v=20260624-cordoba-gps";
import { viajeState } from "../viaje/viaje.state.js";
import { reverseGeocode } from "./services/map.reverse.js?v=20260624-cordoba-gps";

import {
  layerPasajero,
  layerMotoristas,
  layerReferencias
} from "./layers/map.layers.js";

import { renderPOILayer } from "./layers/map.poi.layer.js?v=20260624-cordoba-gps";

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
const GPS_ORIGEN_MAX_AGE_MS = 15000;

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

function streetLine(value, fallback = "Origen") {
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
  const label = escapeHtml(streetLine(direccion, "Origen"));

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
        ${escapeHtml(direccion)}
      </span>
    </div>
  `);

  marcadorPasajero.bindTooltip(label, {
    permanent: true,
    direction: "right",
    offset: [16, 0],
    opacity: 1,
    className: "bego-route-label bego-route-label-origin"
  });
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
  const origenGps = {
    lat,
    lng,
    direccion,
    source: "gps",
    updatedAt: Date.now()
  };

  ultimaUbicacionGps = origenGps;

  if (!viajeProtegido()) {
    viajeState.origen = origenGps;
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

  if (!detectedCity || viajeProtegido()) {
    return false;
  }

  const reloadKey = `BEGO_CITY_RELOAD_${detectedCity.id}`;

  if (detectedCity.id === ACTIVE_CITY) {
    sessionStorage.removeItem(reloadKey);
    return false;
  }

  const reloads = Number(sessionStorage.getItem(reloadKey) || 0);
  if (reloads >= 2) return false;

  setInputInicio(`Cambiando a ${detectedCity.name}...`, { placeholder: true });

  if (!persistDetectedCity(detectedCity.id)) return false;

  sessionStorage.setItem(reloadKey, String(reloads + 1));

  try {
    const url = new URL(window.location.href);
    url.searchParams.set("city", detectedCity.id);
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }

  return true;
}

async function tomarUbicacionActual(map, { center = false, fromButton = false, timeout = null } = {}) {
  const pos = await getCurrentPosition({
    maximumAge: 0,
    timeout: timeout ?? (fromButton ? 18000 : 14000)
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

export async function asegurarOrigenGpsReal(map, {
  center = false,
  fromButton = false,
  timeout = 12000,
  maxAgeMs = GPS_ORIGEN_MAX_AGE_MS
} = {}) {
  if (!map || viajeProtegido()) {
    return !!viajeState.origen;
  }

  const age = ultimaUbicacionGps?.updatedAt
    ? Date.now() - ultimaUbicacionGps.updatedAt
    : Infinity;

  if (ultimaUbicacionGps && age <= maxAgeMs) {
    aplicarUbicacionGps(
      map,
      Number(ultimaUbicacionGps.lat),
      Number(ultimaUbicacionGps.lng),
      ultimaUbicacionGps.direccion || "Tu ubicacion actual",
      { center }
    );
    return true;
  }

  try {
    return await tomarUbicacionActual(map, { center, fromButton, timeout });
  } catch (err) {
    console.warn("No se pudo asegurar GPS real:", err);
    return false;
  }
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
