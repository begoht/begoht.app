import {
  map,
  getRutaActualCoords,
  consumirRutaDesde,
  seguirMotoristaEnMapa
} from "./map.js?v=20260702-visible-labels";
import { isDriverOnline, updateDriverPosition } from "./driver.status.js?v=20260627-map-icons";
import { crearMotoIcon, motoIcon } from "./map.icons.js?v=20260620-driver-navigation";
import {
  setMotorcycleMarkerPose
} from "./map.motion.js?v=20260627-map-fluid-arrival";
import {
  getDriverAccessToken,
  refreshDriverAccessToken
} from "../auth/session.js";

let ultimaPosicion = null;
let ultimaLectura = null;
let motoristaMarker = null;
let ultimaEmisionTime = 0;
let socketRef = null;
let webWatchId = null;
let backgroundWatchId = null;
let lifecycleBound = false;
let capacitorLifecycleBound = false;
let pendingPosition = null;
let ultimaEmisionHttpTime = 0;
let httpFallbackInFlight = false;
let heartbeatTimer = null;
let heartbeatInFlight = false;

const FRECUENCIA_MS = 4000;
const HEARTBEAT_MS = 25000;
const DISTANCIA_MINIMA_METROS = 0.00002;

const LOCATION_DISCLOSURE_KEY = "bego_driver_location_disclosure_v1";

export async function initGPS(socket) {
  socketRef = socket;
  bindLifecycleRefresh();

  if (socketRef && !socketRef.__driverGpsRefreshBound) {
    socketRef.__driverGpsRefreshBound = true;
    socketRef.on("connect", () => {
      flushPendingPosition({ source: "reconnect" });
      refreshDriverLocation({ force: true });
    });
    socketRef.on("driver:location-refresh-required", () => {
      flushPendingPosition({ source: "server-refresh" });
      refreshDriverLocation({ force: true });
    });
  }

  const accepted = await ensureLocationDisclosure();
  if (!accepted) {
    window.dispatchEvent(new CustomEvent("driver:gps-permission-deferred"));
    return;
  }

  await requestBackgroundNotificationPermission();

  if (!startBackgroundGeolocation()) {
    startWebGeolocation();
  }

  startLocationHeartbeat();
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
      backgroundMessage: "Votre position reste active tant que vous etes en ligne.",
      backgroundTitle: "BeGO Driver en ligne",
      requestPermissions: true,
      stale: false,
      distanceFilter: 0
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

function ensureLocationDisclosure() {
  const nativePlugin = window.Capacitor?.Plugins?.BackgroundGeolocation;
  if (!nativePlugin?.addWatcher) return Promise.resolve(true);

  try {
    if (localStorage.getItem(LOCATION_DISCLOSURE_KEY) === "accepted") {
      return Promise.resolve(true);
    }
  } catch {}

  const modal = document.getElementById("driverLocationDisclosure");
  const accept = document.getElementById("driverLocationDisclosureAccept");
  const later = document.getElementById("driverLocationDisclosureLater");
  if (!modal || !accept || !later) return Promise.resolve(false);

  modal.classList.remove("hidden");

  return new Promise((resolve) => {
    const finish = (accepted) => {
      modal.classList.add("hidden");
      accept.removeEventListener("click", onAccept);
      later.removeEventListener("click", onLater);
      if (accepted) {
        try {
          localStorage.setItem(LOCATION_DISCLOSURE_KEY, "accepted");
        } catch {}
      }
      resolve(accepted);
    };
    const onAccept = () => finish(true);
    const onLater = () => finish(false);

    accept.addEventListener("click", onAccept);
    later.addEventListener("click", onLater);
    accept.focus();
  });
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

function startLocationHeartbeat() {
  if (heartbeatTimer) return;

  heartbeatTimer = window.setInterval(async () => {
    if (!isDriverOnline() || heartbeatInFlight) return;
    heartbeatInFlight = true;

    try {
      await refreshDriverLocation({ force: true });
    } finally {
      heartbeatInFlight = false;
    }
  }, HEARTBEAT_MS);
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
  window.addEventListener("online", () => {
    flushPendingPosition({ source: "online" });
    refreshDriverLocation({ force: true });
  });
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
  if (!map || document.hidden || !window.L?.marker) return;

  if (!motoristaMarker) {
    const icon = motoIcon || crearMotoIcon();
    motoristaMarker = L.marker([lat, lng], icon ? { icon } : {}).addTo(map);
    map.setView([lat, lng], 16);
  }

  const pose = setMotorcycleMarkerPose(
    motoristaMarker,
    map,
    { lat, lng },
    {
      routeCoords: getRutaActualCoords(),
      heading,
      maxSnapDistanceMeters: 85,
      onMove: (position) => consumirRutaDesde(position)
    }
  );
  seguirMotoristaEnMapa(pose?.latLng || { lat, lng }, {
    heading: pose?.heading ?? heading
  });
}

async function requestBackgroundNotificationPermission() {
  const plugin = window.Capacitor?.Plugins?.LocalNotifications;
  if (!plugin?.checkPermissions || !plugin?.requestPermissions) return;

  try {
    const current = await plugin.checkPermissions();
    if (current?.display === "prompt" || current?.display === "prompt-with-rationale") {
      await plugin.requestPermissions();
    }
  } catch (error) {
    console.warn("Permission notification GPS:", error?.message || error);
  }
}

function emitPosition({ lat, lng, heading }, { force = false, source = "gps" } = {}) {
  const ahora = Date.now();
  const movidoSuficiente = !ultimaPosicion ||
    Math.abs(ultimaPosicion.lat - lat) > DISTANCIA_MINIMA_METROS ||
    Math.abs(ultimaPosicion.lng - lng) > DISTANCIA_MINIMA_METROS;

  const tiempoSuficiente = ahora - ultimaEmisionTime > FRECUENCIA_MS;
  const heartbeatNecesario = ahora - ultimaEmisionTime > HEARTBEAT_MS;
  const shouldEmit = force || (movidoSuficiente && tiempoSuficiente) || heartbeatNecesario;

  if (!isDriverOnline()) {
    pendingPosition = null;
    return;
  }

  if (!shouldEmit) {
    return;
  }

  const nativeBackground =
    source === "background" &&
    (document.hidden || document.visibilityState === "hidden");

  if (nativeBackground) {
    queuePendingPosition({ lat, lng, heading }, { force, source });
    requestSocketReconnect();
    sendHttpFallback({ lat, lng, heading }, { force: true, source });
    return;
  }

  if (!socketRef?.connected) {
    queuePendingPosition({ lat, lng, heading }, { force, source });
    requestSocketReconnect();
    sendHttpFallback({ lat, lng, heading }, { force, source });
    return;
  }

  ultimaPosicion = { lat, lng };
  ultimaEmisionTime = ahora;
  pendingPosition = null;
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

function queuePendingPosition({ lat, lng, heading }, { force = false, source = "gps" } = {}) {
  pendingPosition = {
    lat,
    lng,
    heading,
    force,
    source,
    queuedAt: Date.now()
  };
}

function flushPendingPosition({ source = "reconnect" } = {}) {
  if (!pendingPosition || !isDriverOnline() || !socketRef?.connected) return;

  const position = pendingPosition;
  pendingPosition = null;
  emitPosition(position, {
    force: true,
    source: `${source}:${position.source || "gps"}`
  });
}

function requestSocketReconnect() {
  if (!socketRef || socketRef.connected) return;

  try {
    socketRef.connect?.();
  } catch {}
}

async function sendHttpFallback(position, { force = false, source = "gps" } = {}) {
  const now = Date.now();
  if (httpFallbackInFlight || (!force && now - ultimaEmisionHttpTime < FRECUENCIA_MS)) {
    return;
  }

  httpFallbackInFlight = true;
  ultimaEmisionHttpTime = now;

  try {
    let token = getDriverAccessToken();
    let response = await requestDriverLocation(position, token, source);

    if (response.status === 401) {
      token = await refreshDriverAccessToken(getServerUrl());
      response = await requestDriverLocation(position, token, source);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    ultimaPosicion = { lat: position.lat, lng: position.lng };
    ultimaEmisionTime = Date.now();
    pendingPosition = null;
  } catch (error) {
    console.warn("Ubicacion en segundo plano pendiente:", error?.message || error);
    queuePendingPosition(position, { force: true, source });
  } finally {
    httpFallbackInFlight = false;
  }
}

function requestDriverLocation({ lat, lng, heading }, token, source) {
  return fetch(`${getServerUrl()}/api/users/driver-location`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token || ""}`,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    },
    body: JSON.stringify({
      lat,
      lng,
      heading,
      disponible: true,
      source
    }),
    keepalive: true
  });
}

function getServerUrl() {
  return typeof window.getServerUrl === "function"
    ? window.getServerUrl().replace(/\/$/, "")
    : window.location.origin.replace(/\/$/, "");
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
