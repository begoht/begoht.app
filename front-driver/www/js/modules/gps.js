import { map, getRutaActualCoords, consumirRutaDesde } from "./map.js?v=20260613-trip-guards";
import { isDriverOnline, updateDriverPosition } from "./driver.status.js?v=20260608-gps-accept";
import { motoIcon } from "./map.icons.js?v=20260603-road-heading-stable";
import {
  setMotorcycleMarkerPose
} from "./map.motion.js?v=20260603-road-heading-stable";

let ultimaPosicion = null;
let ultimaLectura = null;
let motoristaMarker = null;
let ultimaEmisionTime = 0;
let socketRef = null;
let webWatchId = null;
let backgroundWatchId = null;
let lifecycleBound = false;
let capacitorLifecycleBound = false;

const FRECUENCIA_MS = 4000;
const HEARTBEAT_MS = 25000;
const DISTANCIA_MINIMA_METROS = 0.00002;

export function initGPS(socket) {
  socketRef = socket;
  bindLifecycleRefresh();

  if (socketRef && !socketRef.__driverGpsRefreshBound) {
    socketRef.__driverGpsRefreshBound = true;
    socketRef.on("connect", () => refreshDriverLocation({ force: true }));
  }

  if (!startBackgroundGeolocation()) {
    startWebGeolocation();
  }
}

export function getUltimaPosicion() {
  return ultimaLectura || ultimaPosicion;
}

export function setUltimaPosicion(posicion) {
  const lat = Number(posicion?.lat ?? posicion?.latitude);
  const lng = Number(posicion?.lng ?? posicion?.longitude);
  const heading = Number.isFinite(Number(posicion?.heading)) ? Number(posicion.heading) : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  ultimaLectura = { lat, lng, heading };
  updateDriverPosition(ultimaLectura);
  return ultimaLectura;
}

export async function refreshDriverLocation({ force = false } = {}) {
  if (socketRef && !socketRef.connected) {
    socketRef.connect();
  }

  const freshPosition = await readFreshPosition();
  if (freshPosition) {
    handlePosition(freshPosition, { force, source: "resume" });
  } else if (ultimaLectura) {
    emitPosition(ultimaLectura, { force, source: "cached" });
  }
}

function startBackgroundGeolocation() {
  const plugin = window.Capacitor?.Plugins?.BackgroundGeolocation;
  if (!plugin?.addWatcher || backgroundWatchId) return false;

  plugin.addWatcher(
    {
      backgroundMessage: "BeGO actualise votre position pendant la course.",
      backgroundTitle: "BeGO Driver actif",
      requestPermissions: true,
      stale: false,
      distanceFilter: 10
    },
    (location, error) => {
      if (error) {
        console.error("Background GPS error:", error);
        if (!webWatchId) startWebGeolocation();
        return;
      }

      handlePosition(location, { source: "background" });
    }
  ).then((id) => {
    backgroundWatchId = id;
  }).catch((error) => {
    console.error("No se pudo iniciar BackgroundGeolocation:", error);
    startWebGeolocation();
  });

  return true;
}

function startWebGeolocation() {
  if (webWatchId || !navigator.geolocation) return;

  webWatchId = navigator.geolocation.watchPosition(
    (pos) => handlePosition(pos, { source: "web" }),
    (err) => console.error("GPS error:", err),
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );
}

function bindLifecycleRefresh() {
  if (lifecycleBound) return;
  lifecycleBound = true;

  const refresh = () => {
    if (document.visibilityState === "visible") {
      refreshDriverLocation({ force: true });
    }
  };

  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("focus", () => refreshDriverLocation({ force: true }));
  window.addEventListener("online", () => refreshDriverLocation({ force: true }));
  bindCapacitorLifecycleRefresh();
}

function handlePosition(rawPosition, { force = false, source = "gps" } = {}) {
  const position = normalizePosition(rawPosition);
  if (!position) return;

  ultimaLectura = position;
  updateDriverPosition(ultimaLectura);
  window.dispatchEvent(new CustomEvent("driver:gps-position", { detail: position }));
  updateMapPosition(position);
  emitPosition(position, { force, source });
}

function bindCapacitorLifecycleRefresh() {
  if (capacitorLifecycleBound) return;
  capacitorLifecycleBound = true;

  const appPlugin = window.Capacitor?.Plugins?.App;
  if (!appPlugin?.addListener) return;

  const bind = (eventName, handler) => {
    try {
      const result = appPlugin.addListener(eventName, handler);
      result?.catch?.(() => {});
    } catch {}
  };

  bind("appStateChange", (state) => {
    if (state?.isActive) refreshDriverLocation({ force: true });
  });

  bind("resume", () => refreshDriverLocation({ force: true }));
}

function updateMapPosition({ lat, lng, heading }) {
  if (!map || document.hidden) return;

  if (!motoristaMarker) {
    motoristaMarker = L.marker([lat, lng], { icon: motoIcon }).addTo(map);
    map.setView([lat, lng], 16);
  }

  const pose = setMotorcycleMarkerPose(
    motoristaMarker,
    map,
    { lat, lng },
    {
      routeCoords: getRutaActualCoords(),
      heading,
      maxSnapDistanceMeters: 85
    }
  );
  consumirRutaDesde(pose?.latLng || { lat, lng });
}

function emitPosition({ lat, lng, heading }, { force = false, source = "gps" } = {}) {
  const ahora = Date.now();
  const movidoSuficiente = !ultimaPosicion ||
    Math.abs(ultimaPosicion.lat - lat) > DISTANCIA_MINIMA_METROS ||
    Math.abs(ultimaPosicion.lng - lng) > DISTANCIA_MINIMA_METROS;

  const tiempoSuficiente = ahora - ultimaEmisionTime > FRECUENCIA_MS;
  const heartbeatNecesario = ahora - ultimaEmisionTime > HEARTBEAT_MS;

  if (!isDriverOnline() || !socketRef?.connected) {
    return;
  }

  if (force || (movidoSuficiente && tiempoSuficiente) || heartbeatNecesario) {
    ultimaPosicion = { lat, lng };
    ultimaEmisionTime = ahora;
    socketRef.emit("motoristas:ubicacion", {
      lat,
      lng,
      heading,
      heartbeat: !force && !movidoSuficiente,
      disponible: true,
      force,
      source
    });
  }
}

function normalizePosition(posicion) {
  const coords = posicion?.coords || posicion || {};
  const lat = Number(coords.latitude ?? coords.lat);
  const lng = Number(coords.longitude ?? coords.lng);
  const heading = Number.isFinite(Number(coords.heading ?? coords.bearing))
    ? Number(coords.heading ?? coords.bearing)
    : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, heading };
}

function readFreshPosition() {
  if (!navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(normalizePosition(pos)),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 8000
      }
    );
  });
}
