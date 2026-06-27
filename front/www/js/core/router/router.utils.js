import { stopGeo } from "../../map/map.geo.js?v=20260627-map-rotate";

// ===============================
// 🌍 BASE PATH ROBUSTO
// ===============================
export function getBasePath() {
  if (window.Capacitor || window.cordova) return "";
  if (window.location.pathname.includes("/front/www")) {
    return "/front/www";
  }
  return "";
}

export const BASE = getBasePath();

// ===============================
// ⏱️ UTILS DE RENDER Y NAVEGACIÓN
// ===============================
export function afterRender() {
  return new Promise(async (resolve) => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    resolve();
  });
}

export function pushURL(route) {
  if (location.hash !== "#" + route) {
    history.pushState({}, "", "#" + route);
  }
}

export function actualizarLinksActivos(route) {
  document.querySelectorAll("[data-link]").forEach(link => {
    link.classList.toggle(
      "active",
      link.getAttribute("href") === "#" + route
    );
  });
}

export function salirDeVistaMapa() {
  stopGeo();
}
