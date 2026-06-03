// js/map/map.motorista.js

import { viajeState } from "../viaje/viaje.state.js";
import { motoIcon } from "./map.icons.js?v=20260603-transparent-icons";

let mapa;
let followMode = true; // 🔥 cámara sigue al motorista

/*************************************************
 * 🗺️ SET MAPA
 *************************************************/
export function setMapa(mapInstance) {
  mapa = mapInstance;
}

/*************************************************
 * 🎯 CONTROL FOLLOW MODE
 *************************************************/
export function setFollowMode(value) {
  followMode = value;
}

/*************************************************
 * 🛵 MOTORISTA ASIGNADO
 *************************************************/
export function mostrarMotoristaEnMapa(motorista) {

  if (!mapa || !motorista) return;

  let lat = Number(motorista.lat);
  let lng = Number(motorista.lng);

  if (isNaN(lat) || isNaN(lng)) return;

  if (viajeState.motoristaMarker) {

    animarMovimiento(viajeState.motoristaMarker, [lat, lng]);

  } else {

    viajeState.motoristaMarker = L.marker([lat, lng], { icon: motoIcon })
      .addTo(mapa)
      .bindPopup(`🛵 ${motorista.nombre || "Motorista"}`);

  }

  /******** 🎯 FOLLOW INTELIGENTE ********/
  if (followMode) {
    const centro = mapa.getCenter();

    const lejos =
      Math.abs(centro.lat - lat) > 0.002 ||
      Math.abs(centro.lng - lng) > 0.002;

    if (lejos) {
      mapa.setView([lat, lng], mapa.getZoom(), {
        animate: true,
        duration: 0.8
      });
    }
  }
}

/*************************************************
 * 🧹 ELIMINAR MOTORISTA
 *************************************************/
export function eliminarMotoristaDelMapa() {

  if (!mapa) return;

  if (viajeState.motoristaMarker) {
    mapa.removeLayer(viajeState.motoristaMarker);
    viajeState.motoristaMarker = null;
  }

}

/*************************************************
 * 🛵 MOTORISTAS CERCANOS
 *************************************************/
export let motoristasCercanos = {};

export function mostrarMotoristas(drivers) {

  if (!mapa) return;

  const driversArray = Array.isArray(drivers)
    ? drivers
    : Object.values(drivers || {});

  /******** LIMPIAR DESAPARECIDOS ********/
  Object.keys(motoristasCercanos).forEach((id) => {
    if (!driversArray.find(d => (d.id || d._id) === id)) {
      mapa.removeLayer(motoristasCercanos[id]);
      delete motoristasCercanos[id];
    }
  });

  /******** ACTUALIZAR / CREAR ********/
  driversArray.forEach((driver) => {

    const id = driver.id || driver._id;

    let lat = Number(driver.lat ?? driver.location?.lat);
    let lng = Number(driver.lng ?? driver.location?.lng);
    const nombre = driver.nombre;

    if (!id || isNaN(lat) || isNaN(lng)) return;

    if (motoristasCercanos[id]) {

      animarMovimiento(motoristasCercanos[id], [lat, lng]);

    } else {

      motoristasCercanos[id] = L.marker([lat, lng], { icon: motoIcon })
        .addTo(mapa)
        .bindPopup(`🛵 ${nombre || "Motorista"}`);

    }

  });

}

/*************************************************
 * 🎬 ANIMACIÓN SUAVE PRO
 *************************************************/
function animarMovimiento(marker, destino) {

  if (!marker) return;

  // 🔥 cancelar animación previa
  if (marker._animFrame) {
    cancelAnimationFrame(marker._animFrame);
  }

  const inicio = marker.getLatLng();

  const frames = 25;
  let i = 0;

  const deltaLat = destino[0] - inicio.lat;
  const deltaLng = destino[1] - inicio.lng;

  function ease(t) {
    return t * (2 - t); // easeOut
  }

  function mover() {
    if (i >= frames) return;

    const progress = ease(i / frames);

    marker.setLatLng([
      inicio.lat + deltaLat * progress,
      inicio.lng + deltaLng * progress
    ]);

    i++;
    marker._animFrame = requestAnimationFrame(mover);
  }

  mover();
}
