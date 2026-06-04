import { initGeo } from "../map/map.geo.js?v=20260603-proximity-alert";
import { initSeleccionDestino } from "../map/map.destino.js?v=20260603-proximity-alert";
import { actualizarBotonViaje } from "../pasajero/pasajero.ui.js";
import { initToggleMenuDriver, seleccionarPago } from "./pasajero.ui.js"; 
import { getSocket } from "../socket/socket.js";
import { initPasajeroSocket } from "../socket/pasajero.socket.js?v=20260603-proximity-alert";
import { viajeState } from "../viaje/viaje.state.js";
import { setMapa } from "../map/map.motorista.js?v=20260603-proximity-alert";
import { cityConfig } from "../map/config/index.js";
import { initSavedDestinations } from "../map/map.saved-destinations.js";
import { initEnvioPaquete } from "./envio.paquete.js";

/***********************
 * 🧠 CONTROL GLOBAL SPA
 ***********************/
let initIdGlobal = 0;
let viewportHandler = null;

/***********************
 * 🚀 INIT PRINCIPAL
 ***********************/
export function initPasajero(map) {
  const currentInitId = ++initIdGlobal;

  console.log("🚀 Init pasajero (modo PRO)");

  // ✅ Validar vista REAL
  if (!document.querySelector(".home-page")) {
    console.warn("⛔ initPasajero cancelado (no es HOME real)");
    return;
  }

  if (!map) {
    console.warn("⛔ mapa no recibido");
    return;
  }

  try {
    /***********************
     * 🗺️ MAPA GLOBAL
     ***********************/
    setMapa(map);

    const socket = getSocket();

    /***********************
     * 📡 VIEWPORT MOTORISTAS (ANTI DUPLICADOS PRO)
     ***********************/
    function enviarViewport() {
      if (currentInitId !== initIdGlobal) return; // 🔥 anti race SPA
      if (!map || typeof map.getBounds !== "function") return;

      try {
        const bounds = map.getBounds();

        socket.emit("viewport-motoristas", {
          city: cityConfig.id,
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        });

      } catch (e) {
        console.error("💥 Error bounds:", e);
      }
    }

    let viewportTimeout;

    function enviarViewportOptimizado() {
      clearTimeout(viewportTimeout);
      viewportTimeout = setTimeout(enviarViewport, 300);
    }

    // 🔥 limpiar anterior (clave SPA)
    if (viewportHandler) {
      map.off("moveend", viewportHandler);
    }

    viewportHandler = enviarViewportOptimizado;
    map.on("moveend", viewportHandler);

    setTimeout(enviarViewport, 500);

    /***********************
     * 📍 GEO + DESTINO
     ***********************/
    initGeo(map);
    initSeleccionDestino(map);
    initSavedDestinations(map);
    initEnvioPaquete();

    /***********************
     * 🎛️ UI (ANTI DUPLICADOS HARD)
     ***********************/
    initToggleMenuDriver();
    window.seleccionarPago = seleccionarPago;

    const bindClick = (el, handler) => {
      if (!el) return;
      el.replaceWith(el.cloneNode(true)); // 🔥 elimina listeners viejos
      const newEl = document.getElementById(el.id);
      newEl.addEventListener("click", handler);
    };

    bindClick(document.getElementById("btnPagoEfectivo"), (e) =>
      seleccionarPago("efectivo", e.currentTarget)
    );

    bindClick(document.getElementById("btnPagoTransfer"), (e) =>
      seleccionarPago("transferencia", e.currentTarget)
    );

    /***********************
     * 🔌 SOCKETS (ULTRA SEGURO)
     ***********************/
    if (!window.pasajeroInicializado) {
      initPasajeroSocket(); 

      socket.off("connect");
      socket.on("connect", () => {
        console.log("🔄 Socket listo (pasajero)");
      });

      window.pasajeroInicializado = true; // ✅ Marcamos como inicializado
    }

    // Actualizar UI inicial por si hay viajes activos
    actualizarBotonViaje();

  } catch (err) {
    console.error("❌ Error crítico en initPasajero:", err);
  }
} 
