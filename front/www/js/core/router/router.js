import { routes } from "./router.routes.js";
import { renderLayout } from "./router.render.js?v=20260601-layout-fix";
import { runCleanup, setCleanup } from "./router.cleanup.js";
import { afterRender, pushURL, actualizarLinksActivos } from "./router.utils.js";
import { runPageInit } from "../app/app.lifecycle.js";
import { AppState } from "../state.js";
import { stopGeo } from "../../map/map.geo.js";

let navigationId = 0;
let routerReady = false;

// ===============================
// 🚀 NAVIGATE
// ===============================
export async function navigateTo(url) {
  const currentNavigation = ++navigationId;
  const path = normalizarRuta(url || location.hash || location.pathname);

  const route = routes[path] ? path : getDefaultRoute();
  const isHome = route === "/";

  runCleanup();

  try {
    const config = routes[route];

    if (!config) {
      console.warn("⚠️ Ruta no encontrada:", route);
      return;
    }

    let htmlContent = "";
    let mainClass = "";

    // ==========================================
    // 1️⃣ RESOLVER CONTENIDO (FETCH vs JS RENDER)
    // ==========================================
    // Detecta si es un string legacy ("/actividad") o un objeto con url ("/": { url: ... })
    const targetUrl = typeof config === "string" ? config : config.url;

    if (targetUrl) {
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`No se pudo cargar: ${route}`);
      
      const html = await res.text();
      if (currentNavigation !== navigationId) return;

      const doc = new DOMParser().parseFromString(html, "text/html");
      const newMain = doc.querySelector("main");
      
      if (!newMain) {
        console.error("❌ La vista no tiene <main>");
        return;
      }
      
      htmlContent = newMain.innerHTML;
      mainClass = typeof config === "string" 
        ? Array.from(newMain.classList).join(" ") 
        : (config.class || Array.from(newMain.classList).join(" "));
        
    } else if (typeof config.render === "function") {
      htmlContent = config.render();
      mainClass = config.class || "";
    }

    if (currentNavigation !== navigationId) return;

    // ==========================================
    // 2️⃣ RENDERIZAR DOM
    // ==========================================
    renderLayout(route, mainClass, htmlContent);
    await afterRender();
    if (currentNavigation !== navigationId) return;

    // ==========================================
    // 3️⃣ INICIALIZACIÓN Y CICLO DE VIDA
    // ==========================================
    if (typeof config === "string") {
      // Lógica para rutas legacy en string (ej. /actividad)
      AppState.set("pasajeroInicializado", false);
      if (!isHome) stopGeo();
      const mapEl = document.getElementById("map");
      if (mapEl && !isHome) mapEl.classList.add("hidden");
    } else if (typeof config.init === "function") {
      // Lógica para rutas modulares (SPA object)
      const cleanup = config.init();
      if (typeof cleanup === "function") {
        setCleanup(cleanup);
      }
    }

    pushURL(route);
    actualizarLinksActivos(route);
    runPageInit();

  } catch (err) {
    console.error("❌ Error de navegación:", err);

    const main = document.getElementById("appMain");
    if (main) {
      main.innerHTML = `
        <div style="padding:20px;text-align:center">
          <h2>Error cargando la página</h2>
          <p>Intenta nuevamente</p>
        </div>
      `;
    }
  }
}

// ===============================
// 🧠 DEFAULT ROUTE
// ===============================
function getDefaultRoute() {
  if (routes["/"]) return "/";
  return Object.keys(routes)[0];
}

function normalizarRuta(rawUrl) {
  const path = (rawUrl || "/")
    .replace(/^.*#/, "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/front\/www/i, "")
    .replace(/\/index\.html$/i, "/")
    .replace(/\.html$/i, "");

  return path && path !== "#" ? path : "/";
}

// ===============================
// ⚙️ INIT ROUTER
// ===============================
export function initRouter() {
  if (routerReady) return;
  routerReady = true;

  document.addEventListener("click", e => {
    const link = e.target.closest("[data-link]");
    if (link) {
      e.preventDefault();
      navigateTo(link.getAttribute("href"));
    }
  });

  window.addEventListener("popstate", () => {
    navigateTo(location.hash);
  });

  window.addEventListener("hashchange", () => {
    navigateTo(location.hash);
  });

  const start = async () => {
    await afterRender();
    const initialRoute = location.hash || location.pathname || "#/";
    navigateTo(initialRoute);
  };

  if (document.readyState === "loading") {
    window.addEventListener("load", start, { once: true });
  } else {
    start();
  }
}
