import { cityConfig } from "./config/index.js?v=20260624-cordoba-gps";

let mapInstance = null;
let currentContainer = null;
let mapReady = false;
let compassButtonBound = false;
let mapListenerCleanup = [];

/*************************************************
 * 📍 GET MAP (SIEMPRE SEGURO)
 *************************************************/
export function getMap() {
  return mapInstance;
}

/*************************************************
 * 📍 SABER SI EL MAPA ESTÁ LISTO
 *************************************************/
export function isMapReady() {
  return mapReady;
}

/*************************************************
 * 📍 ESPERAR MAPA (para rutas / sockets)
 *************************************************/
export function waitForMap() {

  if (mapReady && mapInstance) {
    return Promise.resolve(mapInstance);
  }

  return new Promise((resolve) => {
    window.addEventListener(
      "map-ready",
      () => resolve(mapInstance),
      { once: true }
    );
  });
}

function cleanupMapListeners() {
  mapListenerCleanup.forEach((cleanup) => {
    try {
      cleanup();
    } catch {}
  });
  mapListenerCleanup = [];
  compassButtonBound = false;
}

function addManagedListener(target, event, handler, options) {
  target?.addEventListener?.(event, handler, options);
  mapListenerCleanup.push(() => target?.removeEventListener?.(event, handler, options));
}

/*************************************************
 * 🚀 CREAR MAPA (ROBUSTO SPA)
 *************************************************/
export function createMap(container) {

  /*************************************************
   * 🧠 CONFIG CIUDAD
   *************************************************/
  const {
    center,
    zoom,
    minZoom,
    bounds
  } = cityConfig.map;

  /*************************************************
   * 🛑 VALIDAR CONTENEDOR
   *************************************************/
  const el =
    typeof container === "string"
      ? document.getElementById(container)
      : container;

  if (!el) {

    console.error(
      "❌ Contenedor de mapa no existe:",
      container
    );

    return null;
  }

  /*************************************************
   * ♻️ REUTILIZAR MAPA EXISTENTE
   *************************************************/
  if (mapInstance && currentContainer === el) {
    return mapInstance;
  }

  /*************************************************
   * 🧹 DESTRUIR MAPA ANTERIOR
   *************************************************/
  if (mapInstance && currentContainer !== el) {

    console.warn("♻️ Reasignando contenedor del mapa");

    try {

      cleanupMapListeners();
      mapInstance.off();
      mapInstance.remove();

    } catch (e) {

      console.warn(
        "⚠️ Error limpiando mapa anterior:",
        e
      );

    }

    mapInstance = null;
    mapReady = false;
  }

  currentContainer = el;

  /*************************************************
   * 🗺️ CREAR MAPA
   *************************************************/
  const vectorRenderer = L.svg({ padding: 0.5 });

  mapInstance = L.map(el, {

    zoomControl: false,
    preferCanvas: false,
    renderer: vectorRenderer,
    zoomAnimation: true,
    fadeAnimation: false,
    markerZoomAnimation: true,
    inertia: false,
    tap: true,
    touchZoom: true,
    minZoom: minZoom || 12,
    rotate: true,
    bearing: 0,
    touchRotate: true,
    rotateControl: false,
    shiftKeyRotate: true,

    // 🔒 limitar navegación
    maxBounds: bounds,
    maxBoundsViscosity: 1.0

  }).setView(center, zoom);

  ensureRotatingPanes(mapInstance);

  /*************************************************
   * 🌍 TILE LAYER
   *************************************************/
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      detectRetina: false,
      updateWhenIdle: false,
      updateWhenZooming: true,
      updateInterval: 16,
      keepBuffer: 8,
      zIndex: 1,
      className: "bego-map-tiles bego-map-primary-tiles"
    }
  ).addTo(mapInstance);

  bindCompassButton(mapInstance);
  bindViewportRefresh(mapInstance);

  /*************************************************
   * ✅ MAP READY
   *************************************************/
  mapInstance.whenReady(() => {

    mapReady = true;

    console.log("🗺️ Map listo");

    // 🔥 evento global SPA
    window.dispatchEvent(
      new Event("map-ready")
    );

  });

  /*************************************************
   * 🧠 FIX SIZE SPA
   *************************************************/
  setTimeout(() => {

    try {

      mapInstance.invalidateSize();

    } catch {}

  }, 100);

  const refreshViewport = () => scheduleViewportRefresh(mapInstance);

  addManagedListener(window, "resize", refreshViewport, { passive: true });
  addManagedListener(window.visualViewport, "resize", refreshViewport, { passive: true });
  addManagedListener(window, "orientationchange", refreshViewport, { passive: true });
  const onVisible = () => {
    if (!document.hidden) scheduleViewportRefresh(mapInstance);
  };
  addManagedListener(document, "visibilitychange", onVisible);

  return mapInstance;
}

function ensureRotatingPanes(map) {
  const rotatePane = map?.getPane?.("rotatePane");
  const tilePane = map?.getPane?.("tilePane");
  const overlayPane = map?.getPane?.("overlayPane");

  if (!rotatePane) return;

  let surface = rotatePane.querySelector(".bego-map-surface");
  if (!surface) {
    surface = document.createElement("div");
    surface.className = "bego-map-surface";
    surface.setAttribute("aria-hidden", "true");
    rotatePane.insertBefore(surface, rotatePane.firstChild);
  }

  [tilePane, overlayPane].forEach((pane) => {
    if (pane && pane.parentElement !== rotatePane) {
      rotatePane.appendChild(pane);
    }
  });
}

function bindCompassButton(map) {
  const btn = document.getElementById("btnNorteMapa");
  if (!btn || compassButtonBound || !map) return;

  compassButtonBound = true;
  const icon = btn.querySelector("i");

  const render = () => {
    const bearing = Number(map.getBearing?.()) || 0;
    btn.classList.toggle("is-rotated", Math.abs(bearing) > 0.5);
    if (icon) icon.style.transform = `rotate(${-bearing}deg)`;
  };

  const resetBearing = () => {
    map.setBearing?.(0);
    render();
  };

  addManagedListener(btn, "click", resetBearing);

  map.on?.("rotate", render);
  mapListenerCleanup.push(() => map.off?.("rotate", render));
  render();
}

function bindViewportRefresh(map) {
  if (!map || map._begoViewportRefreshBound) return;
  map._begoViewportRefreshBound = true;

  mapListenerCleanup.push(() => {
    if (map._begoViewportFrame) window.cancelAnimationFrame(map._begoViewportFrame);
    if (map._begoViewportTimer) window.clearTimeout(map._begoViewportTimer);
    map._begoViewportFrame = 0;
    map._begoViewportTimer = 0;
    map._begoViewportRefreshBound = false;
  });
}

function scheduleViewportRefresh(map) {
  if (!map) return;

  if (map._begoViewportFrame) window.cancelAnimationFrame(map._begoViewportFrame);
  map._begoViewportFrame = window.requestAnimationFrame(() => {
    map._begoViewportFrame = 0;
    try {
      map.invalidateSize({ animate: false, pan: false });
    } catch {}
  });

  if (map._begoViewportTimer) window.clearTimeout(map._begoViewportTimer);
  map._begoViewportTimer = window.setTimeout(() => {
    map._begoViewportTimer = 0;
    try {
      map.invalidateSize({ animate: false, pan: false });
    } catch {}
  }, 180);
}
