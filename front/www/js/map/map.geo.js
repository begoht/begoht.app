import { ACTIVE_CITY, cityConfig, coordsInCity, inferCityConfigFromCoords, persistDetectedCity } from "./config/index.js?v=20260624-cordoba-gps";
import { viajeState } from "../viaje/viaje.state.js";
import { reverseGeocode } from "./services/map.reverse.js?v=20260624-cordoba-gps";
import { centrarMapaEn, getCiudadCentro, mostrarCentroServicio as mostrarCentroServicioBase } from "./map.geo.camera.js?v=20260711-map-geo-camera";
import { bindRecenterButton, bindUbicacionButton } from "./map.geo.events.js?v=20260711-map-geo-events";
import {
  ocultarOrigenEnMapa as ocultarOrigenMarker,
  renderPasajeroMarker,
  tieneOrigenRenderizado
} from "./map.geo.marker.js?v=20260711-map-geo-marker";

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

import {
  coordsValidas as geoCoordsValidas,
  distanciaMetros as geoDistanciaMetros
} from "./utils/map.geo.utils.js?v=20260711-map-geo-utils";

let ultimaUbicacionGps = null;
const GPS_ORIGEN_MAX_AGE_MS = 15000;
const GPS_ORIGEN_RUTA_LOCK_METERS = 80;
const GPS_ORIGEN_MIN_RENDER_METERS = 8;
const GPS_MAX_ACCURACY_METERS = 90;

export function ocultarOrigenEnMapa() {
  ocultarOrigenMarker();
}

function viajeProtegido() {
  return ["buscando", "asignado", "reservado", "llego", "en_curso"].includes(viajeState.estado);
}

function origenDebeOcultarse() {
  return ["llego", "en_curso"].includes(viajeState.estado);
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

function limpiarOrigenSiLibre() {
  if (!viajeProtegido()) {
    viajeState.origen = null;
  }
}

function mostrarCentroServicio(map, mensaje) {
  mostrarCentroServicioBase(map, mensaje, {
    origen: viajeState.origen,
    setInputInicio,
    renderPasajeroMarker
  });
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

  if (viajeProtegido() && geoCoordsValidas(viajeState.origen)) {
    const origenFijo = viajeState.origen;
    setInputInicio(origenFijo.direccion || direccion);
    renderPasajeroMarker(
      map,
      Number(origenFijo.lat),
      Number(origenFijo.lng),
      origenFijo.direccion || direccion
    );
    return;
  }

  const tieneDestino = geoCoordsValidas(viajeState.destino);
  const origenActual = viajeState.origen;
  const distanciaDesdeOrigen = geoDistanciaMetros(origenActual, origenGps);

  if (
    !center &&
    !tieneDestino &&
    geoCoordsValidas(origenActual) &&
    distanciaDesdeOrigen < GPS_ORIGEN_MIN_RENDER_METERS
  ) {
    setInputInicio(origenActual.direccion || direccion);
    return;
  }

  if (
    !center &&
    tieneDestino &&
    geoCoordsValidas(origenActual) &&
    distanciaDesdeOrigen < GPS_ORIGEN_RUTA_LOCK_METERS
  ) {
    setInputInicio(origenActual.direccion || direccion);
    renderPasajeroMarker(
      map,
      Number(origenActual.lat),
      Number(origenActual.lng),
      origenActual.direccion || direccion
    );
    return;
  }

  if (!viajeProtegido()) {
    viajeState.origen = origenGps;
  }

  if (center || !tieneOrigenRenderizado()) {
    map.setView([lat, lng], 16);
  }

  setInputInicio(direccion);
  renderPasajeroMarker(map, lat, lng, direccion, { animate });

  if (!center && tieneDestino && distanciaDesdeOrigen >= GPS_ORIGEN_RUTA_LOCK_METERS) {
    import("./map.ruta.js?v=20260710-route-camera")
      .then(({ dibujarRuta }) => dibujarRuta(origenGps, viajeState.destino, true))
      .catch((err) => console.warn("No se pudo reajustar la ruta al GPS:", err));
  }
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
  const accuracy = Number(pos.coords.accuracy);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("GPS invalido");
  }

  if (Number.isFinite(accuracy) && accuracy > GPS_MAX_ACCURACY_METERS && geoCoordsValidas(viajeState.origen)) {
    return true;
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
  bindUbicacionButton(map, { tomarUbicacionActual, setInputInicio });
  bindRecenterButton(map, {
    tomarUbicacionActual,
    centrarMapaEn,
    mostrarCentroServicio,
    getFallbackPoint: () => ultimaUbicacionGps || viajeState.origen || getCiudadCentro()
  });

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
      const accuracy = Number(pos.coords.accuracy);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (Number.isFinite(accuracy) && accuracy > GPS_MAX_ACCURACY_METERS && geoCoordsValidas(viajeState.origen)) return;

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
