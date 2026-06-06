import { cityConfig } from "./config/index.js";

let mapInstance = null;
let currentContainer = null;
let mapReady = false;

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

    const interval = setInterval(() => {

      if (mapReady && mapInstance) {

        clearInterval(interval);
        resolve(mapInstance);

      }

    }, 50);

  });
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
  mapInstance = L.map(el, {

    zoomControl: false,
    preferCanvas: true,
    tap: true,
    touchZoom: true,
    minZoom: minZoom || 12,

    // 🔒 limitar navegación
    maxBounds: bounds,
    maxBoundsViscosity: 1.0

  }).setView(center, zoom);

  /*************************************************
   * 🌍 TILE LAYER
   *************************************************/
  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap",
      detectRetina: true,
      updateWhenIdle: true,
      keepBuffer: 3
    }
  ).addTo(mapInstance);

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

  const invalidate = () => {

    try {

      mapInstance?.invalidateSize({ animate: false });

    } catch {}

  };

  window.addEventListener("resize", invalidate, { passive: true });
  window.visualViewport?.addEventListener("resize", invalidate, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) setTimeout(invalidate, 150);
  });

  return mapInstance;
}
