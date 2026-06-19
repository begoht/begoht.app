import {
  reverseGeocode
} from "./services/map.reverse.js";

import {
  setMapaInstance,
  getMapaInstance
} from "./state/map.motoristas.state.js";

import {
  renderMotorista,
  removeMotorista
} from "./ui/map.motorista.renderer.js?v=20260619-map-ref-button";

import {
  renderMotoristas,
  clearMotoristas
} from "./ui/map.motoristas.renderer.js?v=20260619-map-ref-button";

/*************************************************
 * 🗺️ SET MAPA
 *************************************************/
export function setMapa(
  mapInstance
) {
  setMapaInstance(mapInstance);
}

/*************************************************
 * 🧹 LIMPIAR MOTORISTAS
 *************************************************/
export function limpiarMotoristas() {

  const mapa =
    getMapaInstance();

  clearMotoristas(mapa);
}

/*************************************************
 * 🛵 MOTORISTA ASIGNADO
 *************************************************/
export function mostrarMotoristaEnMapa(
  motorista
) {

  const mapa =
    getMapaInstance();

  if (!mapa) {
    window.addEventListener(
      "map-ready",
      () => mostrarMotoristaEnMapa(motorista),
      { once: true }
    );
    return;
  }

  renderMotorista(
    mapa,
    motorista
  );
}

/*************************************************
 * ❌ ELIMINAR MOTORISTA
 *************************************************/
export function eliminarMotoristaDelMapa() {

  const mapa =
    getMapaInstance();

  removeMotorista(mapa);
}

/*************************************************
 * 🛵 MOTORISTAS CERCANOS
 *************************************************/
export function mostrarMotoristas(
  drivers
) {

  const mapa =
    getMapaInstance();

  renderMotoristas(
    mapa,
    drivers
  );
}

/*************************************************
 * 🌍 REVERSE GEOCODE
 *************************************************/
export async function obtenerDireccion(
  lat,
  lng
) {

  return reverseGeocode(
    lat,
    lng
  );
}
