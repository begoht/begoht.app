import { getSocket } from "./socket.js?v=20260713-live-trip-tracking";
import { viajeState } from "../viaje/viaje.state.js";

import { handlePrecio } from "./handlers/precio.handler.js?v=20260713-live-trip-tracking";
import { handleAsignado } from "./handlers/asignado.handler.js?v=20260713-live-trip-tracking";
import { handleTrack } from "./handlers/track.handler.js?v=20260713-live-trip-tracking";
import { handleLlego } from "./handlers/llego.handler.js?v=20260713-live-trip-tracking";
import { handleIniciado } from "./handlers/iniciado.handler.js?v=20260713-live-trip-tracking";
import { handleFinalizado } from "./handlers/finalizado.handler.js?v=20260713-live-trip-tracking";
import { handleConnect } from "./handlers/connect.handler.js?v=20260629-email-receipt";
import { handleError } from "./handlers/error.handler.js?v=20260713-live-trip-tracking";
import { handleNoMotorista } from "./handlers/noMotorista.handler.js?v=20260713-live-trip-tracking";
import { handleCancelado } from "./handlers/cancelado.handler.js?v=20260713-live-trip-tracking";
import { handleExpirado } from "./handlers/expirado.handler.js?v=20260713-live-trip-tracking";
import { handleSync } from "./handlers/sync.handler.js?v=20260713-live-trip-tracking";
import { handleEstado } from "./handlers/estado.handler.js?v=20260628-dark-route-locked";
import { handleMotoristaCandidato } from "./handlers/candidato.handler.js?v=20260615-smooth-autofinish";
import { handleBuscando } from "./handlers/buscando.handler.js?v=20260713-live-trip-tracking";
import { handleProximidad } from "./handlers/proximidad.handler.js";
import {
  handleIdaVueltaPendiente,
  handleRetornoAnulado,
  handleRetornoIniciado
} from "./handlers/idaVuelta.handler.js?v=20260713-live-trip-tracking";
import { initPasajeroChat } from "../chat/viajeChat.pasajero.js";

let listenersRegistrados = false;
let handlersActivos = {};
const eventosRecientes = new Map();
let lastTrackAt = 0;
let trackingWatchdog = null;

const MAPEO_EVENTOS = {
  "precio-calculado": handlePrecio,
  "viaje-asignado": handleAsignado,
  "track:posicion": handleTrack,
  "viaje:motorista-llego": handleLlego,
  "viaje:iniciado": handleIniciado,
  "viaje-finalizado": handleFinalizado,
  connect: handleConnect,
  "viaje-error": handleError,
  "no-motorista": handleNoMotorista,
  "viaje:cancelado": handleCancelado,
  "viaje-expirado": handleExpirado,
  "viaje-sync": handleSync,
  "viaje:estado": handleEstado,
  "busqueda:motorista-candidato": handleMotoristaCandidato,
  "viaje-buscando": handleBuscando,
  "notificacion-proximidad": handleProximidad,
  "ida-vuelta:pendiente": handleIdaVueltaPendiente,
  "ida-vuelta:retorno-iniciado": handleRetornoIniciado,
  "ida-vuelta:retorno-anulado": handleRetornoAnulado
};

export function initPasajeroSocket() {
  const socket = getSocket();
  if (!socket) return;

  bindForegroundSync(socket);

  if (listenersRegistrados) {
    requestPassengerSync(socket);
    return;
  }

  listenersRegistrados = true;
  console.log("Pasajero Socket: INIT PRO MODULAR");

  Object.entries(MAPEO_EVENTOS).forEach(([eventName, handlerFunc]) => {
    if (handlersActivos[eventName]) {
      socket.off(eventName, handlersActivos[eventName]);
    }

    const wrapped = (data) => {
      if (eventName !== "precio-calculado" && esEventoDuplicado(eventName, data)) {
        return;
      }

      if (
        eventName === "track:posicion" &&
        (!viajeState.viajeId || !viajeState.activo)
      ) {
        return;
      }

      if (eventName === "track:posicion") lastTrackAt = Date.now();

      console.log(`EVENTO [${eventName}]:`, data);

      if (["viaje-finalizado", "viaje:cancelado", "viaje-expirado"].includes(eventName)) {
        const vId = data?.viajeId || viajeState.viajeId;
        if (vId) {
          console.log(`Abandonando sala de tracking: track:${vId}`);
          socket.emit("track:leave", { viajeId: vId });
        }
      }

      handlerFunc(data, socket);
    };

    handlersActivos[eventName] = wrapped;
    socket.on(eventName, wrapped);
  });

  initPasajeroChat(socket);
  startTrackingWatchdog(socket);

  requestPassengerSync(socket);
}

function startTrackingWatchdog(socket) {
  if (trackingWatchdog) return;
  trackingWatchdog = window.setInterval(() => {
    if (!viajeState.viajeId || !viajeState.activo || viajeState.finalizado) return;
    if (lastTrackAt && Date.now() - lastTrackAt < 30000) return;
    requestPassengerSync(socket);
  }, 15000);
}

function bindForegroundSync(socket) {
  if (!socket || socket.__passengerForegroundSyncBound) return;
  socket.__passengerForegroundSyncBound = true;

  let lastSyncAt = 0;

  const requestSync = () => {
    if (document.visibilityState && document.visibilityState !== "visible") return;

    if (!socket.connected) {
      socket.connect?.();
      return;
    }

    const now = Date.now();
    if (now - lastSyncAt < 1000) return;
    lastSyncAt = now;

    requestPassengerSync(socket);
  };

  document.addEventListener("visibilitychange", requestSync);
  window.addEventListener("focus", requestSync);
  window.addEventListener("online", requestSync);

  const appPlugin = window.Capacitor?.Plugins?.App;
  if (appPlugin?.addListener) {
    const bind = (eventName, handler) => {
      try {
        const result = appPlugin.addListener(eventName, handler);
        result?.catch?.(() => {});
      } catch {}
    };

    bind("appStateChange", (state) => {
      if (state?.isActive) requestSync();
    });
    bind("resume", requestSync);
  }
}

function requestPassengerSync(socket) {
  if (!socket) return;

  if (!socket.connected) {
    socket.connect?.();
    return;
  }

  if (viajeState.viajeId) {
    socket.emit("join-room", `track:${viajeState.viajeId}`);
  }

  socket.emit("sync-pasajero", { viajeId: getStoredViajeId() });
}

function getStoredViajeId() {
  if (viajeState.viajeId) return String(viajeState.viajeId);

  try {
    const stored = JSON.parse(localStorage.getItem("viajeActivo") || "null");
    return stored?.viajeId ? String(stored.viajeId) : null;
  } catch {
    return null;
  }
}

function esEventoDuplicado(eventName, data = {}) {
  const viajeId = data?.viajeId || viajeState.viajeId || "";
  const estado = data?.estado || "";
  const lat = data?.lat != null ? Number(data.lat).toFixed(6) : "";
  const lng = data?.lng != null ? Number(data.lng).toFixed(6) : "";
  const source = data?.isReplay ? "replay" : data?.isSnapshot ? "snapshot" : "live";
  const key = `${eventName}:${viajeId}:${estado}:${lat}:${lng}:${source}`;
  const now = Date.now();
  const last = eventosRecientes.get(key) || 0;
  const ventanaMs = eventName === "track:posicion" ? 900 : 1500;

  if (now - last < ventanaMs) {
    if (eventName !== "track:posicion") {
      console.log(`Evento duplicado ignorado [${eventName}]`);
    }
    return true;
  }

  eventosRecientes.set(key, now);

  for (const [oldKey, timestamp] of eventosRecientes.entries()) {
    if (now - timestamp > 5000) {
      eventosRecientes.delete(oldKey);
    }
  }

  return false;
}

export function destroyPasajeroSocket() {
  const socket = getSocket();
  if (!socket) return;

  Object.entries(handlersActivos).forEach(([eventName, boundHandler]) => {
    socket.off(eventName, boundHandler);
  });

  handlersActivos = {};
  listenersRegistrados = false;
  eventosRecientes.clear();
  lastTrackAt = 0;
  if (trackingWatchdog) window.clearInterval(trackingWatchdog);
  trackingWatchdog = null;
  console.log("Pasajero Socket destruido");
}
