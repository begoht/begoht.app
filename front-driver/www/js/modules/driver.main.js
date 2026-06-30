import { initSocket } from "./socket.js?v=20260627-map-icons";
import { initMap } from "./map.js?v=20260627-map-fluid-arrival";
import { initGPS } from "./gps.js?v=20260627-map-icons";
import { initOferta } from "./oferta/oferta.index.js?v=20260627-map-icons";
import { initViajeInicio } from "./viajeInicio/viajeInicio.js?v=20260623-roundtrip-v2";
import { initViajeFinalizar } from "./viajeFinalizar.js?v=20260627-map-fluid-arrival";
import { initViajeControl } from "./viajeControl/viajeControl.js?v=20260627-map-fluid-arrival";
import { initIdaVueltaDriver } from "./idaVuelta/idaVuelta.driver.js?v=20260627-map-fluid-arrival";
import { initDriverChat } from "./chat/viajeChat.js?v=20260608-trip-panel-compact";
import { initDriverStatus } from "./driver.status.js?v=20260627-map-icons";
import { initDriverSpa } from "./driver.spa.js?v=20260629-news-push";
import { iniciarSonidoOfertaLoop } from "./oferta/oferta.ui.js?v=20260608-offer-net-cash";
import { initLaunchCountdown } from "./launch-countdown.js?v=20260603-launch-gate";
import { initDriverNotifications } from "./notifications.js?v=20260629-news-push";
import {
  getDriverAccessToken,
  refreshDriverAccessToken
} from "../auth/session.js";

document.addEventListener("DOMContentLoaded", async () => {
  const bootStatus = document.getElementById("driverBootStatus");
  let revealPromise = null;

  const setBootStatus = (message) => {
    if (bootStatus) bootStatus.textContent = message;
  };

  const mostrarAppConectada = () => {
    if (revealPromise) return revealPromise;

    revealPromise = Promise.resolve().then(() => {
      document.documentElement.classList.remove("driver-booting");
      document.documentElement.classList.add("driver-ready");
    });

    return revealPromise;
  };

  bindGlobalUi();

  let token = getDriverAccessToken();

  if (token?.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  if (!token) {
    try {
      token = await refreshDriverAccessToken();
    } catch {
      token = null;
    }
  }

  if (!token) {
    alert("Sesion expirada o no iniciada. Inicia sesion nuevamente.");
    window.location.replace("login.html");
    return;
  }

  const serverUrl = typeof window.getServerUrl === "function"
    ? window.getServerUrl()
    : window.location.origin;

  setBootStatus("Verification du lancement...");
  await initLaunchCountdown();

  setBootStatus("Chargement de la connexion...");
  const socketIoReady = await Promise.resolve(window.begoSocketIoReady).catch(() => false);
  const leafletReady = await Promise.resolve(window.begoLeafletReady).catch(() => false);

  if (!leafletReady) {
    window.begoReportFrontendError?.({
      level: "warning",
      type: "driver_leaflet_unavailable",
      message: "Leaflet no cargo; la app continua sin mapa hasta recargar."
    });
  }

  if (!socketIoReady || typeof window.io !== "function") {
    setBootStatus("Connexion temps reel indisponible. Verifie Internet et relance l'app.");
    safeInit("driver-pages", initDriverSpa);
    mostrarAppConectada();
    return;
  }

  setBootStatus("Connexion au serveur...");

  let socket = null;
  try {
    socket = initSocket(serverUrl, token);
  } catch (error) {
    console.error("Socket.IO init error:", error);
    setBootStatus("Connexion temps reel indisponible. Verifie Internet et relance l'app.");
    safeInit("driver-pages", initDriverSpa);
    mostrarAppConectada();
    return;
  }

  safeInit("driver-status", () => initDriverStatus(socket));
  safeInit("driver-notifications", () => initDriverNotifications(socket));

  if (socket.connected) {
    mostrarAppConectada();
  }

  socket.once("connect", () => {
    setBootStatus("Connecte.");
    mostrarAppConectada();
  });

  socket.on("connect_error", (err) => {
    setBootStatus("Connexion indisponible. Nouvelle tentative...");
    console.error("Error de conexion inicial:", err?.message || err);
  });

  setTimeout(() => {
    if (socket.connected) {
      mostrarAppConectada();
    } else {
      setBootStatus("La connexion prend du temps. Nouvelle tentative...");
    }
  }, 12000);

  const uiElements = {
    btnIniciar: document.getElementById("btnIniciarViaje"),
    btnFinalizar: document.getElementById("btnFinalizar"),
    btnLlegue: document.getElementById("btnLlegue"),
    estadoBox: document.getElementById("estadoViaje")
  };

  safeInit("map", initMap);
  safeInit("gps", () => initGPS(socket));
  safeInit("trip-control", () => initViajeControl(socket, uiElements));
  safeInit("chat", () => initDriverChat(socket));
  safeInit("offers", () => initOferta(socket));
  safeInit("trip-start", () => initViajeInicio(socket));
  safeInit("trip-finish", () => initViajeFinalizar(socket));
  safeInit("round-trip", () => initIdaVueltaDriver(socket));
  safeInit("driver-pages", initDriverSpa);

  console.log("Modulos de Motorista inicializados");
});

function safeInit(name, init) {
  try {
    init();
  } catch (error) {
    console.error(`Error inicializando ${name}:`, error);
    window.begoReportFrontendError?.({
      level: "error",
      type: "driver_module_init_error",
      message: `${name}: ${error?.message || error}`,
      stack: error?.stack || ""
    });
  }
}

function bindGlobalUi() {
  window.toggleMenu = function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("backdrop");

    if (sidebar && backdrop) {
      sidebar.classList.toggle("active");
      backdrop.classList.toggle("active");
    }
  };

  let audioUnlocked = false;

  function unlockAudio() {
    if (audioUnlocked) return;

    const audio = new Audio();
    audio.play().catch(() => {});
    audioUnlocked = true;

    const panel = document.getElementById("panelOferta");
    if (panel && !panel.classList.contains("hidden")) {
      iniciarSonidoOfertaLoop();
    }
  }

  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });
}
