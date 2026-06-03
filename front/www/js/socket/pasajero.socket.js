import { getSocket } from "./socket.js";
import { viajeState } from "../viaje/viaje.state.js";

import { handleMotoristas } from "./handlers/motoristas.handler.js";
import { handlePrecio } from "./handlers/precio.handler.js";
import { handleAsignado } from "./handlers/asignado.handler.js?v=20260603-location-dedupe";
import { handleTrack } from "./handlers/track.handler.js?v=20260603-location-dedupe";
import { handleLlego } from "./handlers/llego.handler.js";
import { handleIniciado } from "./handlers/iniciado.handler.js";
import { handleFinalizado } from "./handlers/finalizado.handler.js";
import { handleConnect } from "./handlers/connect.handler.js";
import { handleError } from "./handlers/error.handler.js";
import { handleNoMotorista } from "./handlers/noMotorista.handler.js";
import { handleCancelado } from "./handlers/cancelado.handler.js";
import { handleExpirado } from "./handlers/expirado.handler.js";
import { handleSync } from "./handlers/sync.handler.js?v=20260603-location-dedupe";
import { handleEstado } from "./handlers/estado.handler.js";
import { handleMotoristaCandidato } from "./handlers/candidato.handler.js";
import { handleBuscando } from "./handlers/buscando.handler.js";
import { initPasajeroChat } from "../chat/viajeChat.pasajero.js";

let listenersRegistrados = false;
let handlersActivos = {};
const eventosRecientes = new Map();

const MAPEO_EVENTOS = {
  "motoristas:ubicacion": handleMotoristas,
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
  "viaje-buscando": handleBuscando
};

export function initPasajeroSocket() {
  const socket = getSocket();
  if (!socket || listenersRegistrados) return;

  listenersRegistrados = true;
  console.log("Pasajero Socket: INIT PRO MODULAR");

  Object.entries(MAPEO_EVENTOS).forEach(([eventName, handlerFunc]) => {
    if (handlersActivos[eventName]) {
      socket.off(eventName, handlersActivos[eventName]);
    }

    const wrapped = (data) => {
      if (esEventoDuplicado(eventName, data)) {
        return;
      }

      if (
        eventName === "motoristas:ubicacion" &&
        viajeState.activo
      ) {
        return;
      }

      if (
        eventName === "track:posicion" &&
        (!viajeState.viajeId || !viajeState.activo)
      ) {
        return;
      }

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
}

function esEventoDuplicado(eventName, data = {}) {
  const viajeId = data?.viajeId || viajeState.viajeId || "";
  const estado = data?.estado || "";
  const lat = data?.lat != null ? Number(data.lat).toFixed(6) : "";
  const lng = data?.lng != null ? Number(data.lng).toFixed(6) : "";
  const listaSignature = Array.isArray(data) ? crearListaMotoristasSignature(data) : "";
  const source = data?.isReplay ? "replay" : data?.isSnapshot ? "snapshot" : "live";
  const key = `${eventName}:${viajeId}:${estado}:${lat}:${lng}:${listaSignature}:${source}`;
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

function crearListaMotoristasSignature(motoristas) {
  return motoristas
    .map((m) => ({
      id: String(m?.id || m?._id || ""),
      lat: Number(m?.lat).toFixed(5),
      lng: Number(m?.lng).toFixed(5)
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => `${m.id}:${m.lat}:${m.lng}`)
    .join("|");
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
  console.log("Pasajero Socket destruido");
}
