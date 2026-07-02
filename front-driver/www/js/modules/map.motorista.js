import { viajeState } from "../viaje/viaje.state.js";
import { motoIcon } from "./map.icons.js?v=20260620-driver-navigation";
import { getRutaActualCoords } from "./map.js?v=20260702-visible-labels";
import {
  setMotorcycleMarkerPose
} from "./map.motion.js?v=20260627-map-fluid-arrival";

let mapa;
let followMode = true;
let followPausedUntil = 0;

const FOLLOW_PAUSE_MS = 12000;

export function setMapa(mapInstance) {
  mapa = mapInstance;
  bindFollowPause();
}

export function setFollowMode(value) {
  followMode = value;
}

export function mostrarMotoristaEnMapa(motorista) {
  if (!mapa || !motorista) return;

  const lat = Number(motorista.lat);
  const lng = Number(motorista.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  if (viajeState.motoristaMarker) {
    animarMovimiento(viajeState.motoristaMarker, { lat, lng }, motorista.heading);
  } else {
    viajeState.motoristaMarker = L.marker([lat, lng], { icon: motoIcon })
      .addTo(mapa)
      .bindPopup(`Motorista: ${motorista.nombre || "Motorista"}`);

    setMotorcycleMarkerPose(viajeState.motoristaMarker, mapa, { lat, lng }, {
      routeCoords: getRutaActualCoords(),
      heading: motorista.heading,
      maxSnapDistanceMeters: 85
    });
  }

  if (followMode && Date.now() >= followPausedUntil) {
    const markerPos = viajeState.motoristaMarker?.getLatLng?.() || { lat, lng };
    const centro = mapa.getCenter();
    const lejos =
      Math.abs(centro.lat - markerPos.lat) > 0.002 ||
      Math.abs(centro.lng - markerPos.lng) > 0.002;

    if (lejos) {
      mapa.panInside(markerPos, {
        padding: [72, 72],
        animate: true,
        duration: 0.8
      });
    }
  }
}

function bindFollowPause() {
  if (!mapa || mapa._begoDriverFollowPauseBound) return;
  mapa._begoDriverFollowPauseBound = true;

  const pause = () => {
    followPausedUntil = Date.now() + FOLLOW_PAUSE_MS;
  };

  mapa.on?.("dragstart", pause);
  mapa.on?.("zoomstart", pause);
}

export function eliminarMotoristaDelMapa() {
  if (!mapa) return;

  if (viajeState.motoristaMarker) {
    mapa.removeLayer(viajeState.motoristaMarker);
    viajeState.motoristaMarker = null;
  }
}

export let motoristasCercanos = {};

export function mostrarMotoristas(drivers) {
  if (!mapa) return;

  const driversArray = Array.isArray(drivers)
    ? drivers
    : Object.values(drivers || {});

  Object.keys(motoristasCercanos).forEach((id) => {
    if (!driversArray.find((d) => (d.id || d._id) === id)) {
      mapa.removeLayer(motoristasCercanos[id]);
      delete motoristasCercanos[id];
    }
  });

  driversArray.forEach((driver) => {
    const id = driver.id || driver._id;
    const lat = Number(driver.lat ?? driver.location?.lat);
    const lng = Number(driver.lng ?? driver.location?.lng);

    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (motoristasCercanos[id]) {
      animarMovimiento(motoristasCercanos[id], { lat, lng }, driver.heading);
      return;
    }

    motoristasCercanos[id] = L.marker([lat, lng], { icon: motoIcon })
      .addTo(mapa)
      .bindPopup(`Motorista: ${driver.nombre || "Motorista"}`);

    setMotorcycleMarkerPose(motoristasCercanos[id], mapa, { lat, lng }, {
      heading: driver.heading
    });
  });
}

function animarMovimiento(marker, destino, heading = null) {
  if (!marker) return;

  if (marker._animFrame) cancelAnimationFrame(marker._animFrame);

  if (Date.now() < followPausedUntil) {
    setMotorcycleMarkerPose(marker, mapa, destino, {
      routeCoords: getRutaActualCoords(),
      heading,
      maxSnapDistanceMeters: 85
    });
    return;
  }

  const inicio = marker.getLatLng();
  const frames = 25;
  let i = 0;

  const deltaLat = destino.lat - inicio.lat;
  const deltaLng = destino.lng - inicio.lng;

  function ease(t) {
    return t * (2 - t);
  }

  function mover() {
    if (i >= frames) return;

    const progress = ease(i / frames);

    setMotorcycleMarkerPose(marker, mapa, {
      lat: inicio.lat + deltaLat * progress,
      lng: inicio.lng + deltaLng * progress
    }, {
      routeCoords: getRutaActualCoords(),
      heading,
      maxSnapDistanceMeters: 85
    });

    i++;
    marker._animFrame = requestAnimationFrame(mover);
  }

  mover();
}
