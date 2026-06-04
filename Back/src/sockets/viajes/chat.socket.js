const mongoose = require("mongoose");
const Viaje = require("../../models/Viaje");

const ESTADOS_CHAT = new Set(["asignado", "llego", "en_curso"]);
const MAX_TEXTO = 500;

function getUserId(socket) {
  return socket.user?._id?.toString() || socket.user?.id?.toString();
}

function limpiarTexto(texto) {
  return String(texto || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXTO);
}

async function obtenerViajeAutorizado(socket, viajeId) {
  const userId = getUserId(socket);

  if (!userId || !mongoose.Types.ObjectId.isValid(viajeId)) {
    return null;
  }

  const viaje = await Viaje.findById(viajeId)
    .select("estado pasajero motorista")
    .lean();

  if (!viaje || !ESTADOS_CHAT.has(viaje.estado)) {
    return null;
  }

  const pasajeroId = viaje.pasajero?.toString();
  const motoristaId = viaje.motorista?.toString();

  return userId === pasajeroId || userId === motoristaId ? viaje : null;
}

function crearMensaje({ socket, viaje, viajeId, texto, clientId }) {
  const userId = getUserId(socket);
  const senderRole =
    userId === viaje.motorista?.toString()
      ? "motorista"
      : "pasajero";

  return {
    id:
      clientId ||
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
    viajeId: String(viajeId),
    senderId: userId,
    senderRole,
    senderName:
      socket.user?.nombre ||
      socket.user?.name ||
      senderRole,
    texto,
    clientId: clientId || null,
    createdAt: new Date(),
  };
}

function emitirAParticipantes(io, viaje, eventName, payload) {
  const pasajeroId = viaje.pasajero?.toString();
  const motoristaId = viaje.motorista?.toString();

  io.to(`viaje-chat:${payload.viajeId}`)
    .to(`pasajero:${pasajeroId}`)
    .to(`motorista:${motoristaId}`)
    .emit(eventName, payload);
}

function cerrarChatViaje(io, viajeId) {
  if (!io || !viajeId) return;

  io.to(`viaje-chat:${viajeId}`).emit("viaje:chat:closed", {
    viajeId,
  });

  io.in(`viaje-chat:${viajeId}`).socketsLeave(`viaje-chat:${viajeId}`);
}

module.exports = function initViajeChat(io, socket) {
  if (socket._viajeChatRegistered) return;
  socket._viajeChatRegistered = true;

  socket.on("viaje:chat:join", async ({ viajeId } = {}) => {
    try {
      const viaje = await obtenerViajeAutorizado(socket, viajeId);

      if (!viaje) {
        return socket.emit("viaje:chat:error", {
          viajeId,
          mensaje: "Chat no disponible para este viaje",
        });
      }

      socket.join(`viaje-chat:${viajeId}`);

      socket.emit("viaje:chat:history", {
        viajeId,
        mensajes: [],
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error join chat viaje:", err);

      socket.emit("viaje:chat:error", {
        viajeId,
        mensaje: "No se pudo abrir el chat",
      });
    }
  });

  socket.on("viaje:chat:send", async ({ viajeId, texto, clientId } = {}) => {
    try {
      const viaje = await obtenerViajeAutorizado(socket, viajeId);
      const mensajeLimpio = limpiarTexto(texto);

      if (!viaje || !mensajeLimpio) {
        return socket.emit("viaje:chat:error", {
          viajeId,
          clientId,
          mensaje: "Mensaje no enviado",
        });
      }

      const payload = crearMensaje({
        socket,
        viaje,
        viajeId,
        texto: mensajeLimpio,
        clientId,
      });

      emitirAParticipantes(io, viaje, "viaje:chat:mensaje", payload);
    } catch (err) {
      console.error("Error enviando chat viaje:", err);

      socket.emit("viaje:chat:error", {
        viajeId,
        clientId,
        mensaje: "No se pudo enviar el mensaje",
      });
    }
  });

  socket.on("viaje:chat:typing", async ({ viajeId, isTyping } = {}) => {
    try {
      const viaje = await obtenerViajeAutorizado(socket, viajeId);
      if (!viaje) return;

      const userId = getUserId(socket);
      const senderRole =
        userId === viaje.motorista?.toString()
          ? "motorista"
          : "pasajero";

      emitirAParticipantes(io, viaje, "viaje:chat:typing", {
        viajeId: String(viajeId),
        senderRole,
        isTyping: Boolean(isTyping),
      });
    } catch (err) {
      console.error("Error typing chat viaje:", err);
    }
  });

  socket.on("viaje:chat:leave", ({ viajeId } = {}) => {
    if (viajeId) {
      socket.leave(`viaje-chat:${viajeId}`);
    }
  });

  ["viaje-finalizado", "viaje:cancelado", "viaje-expirado"].forEach((evento) => {
    socket.on(evento, ({ viajeId } = {}) => {
      cerrarChatViaje(io, viajeId);
    });
  });
};

module.exports.limpiarChatViaje = function limpiarChatViaje(viajeId) {
  cerrarChatViaje(global.io, viajeId);
};
