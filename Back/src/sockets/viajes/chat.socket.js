const mongoose = require("mongoose");
const Viaje = require("../../models/Viaje");

const ESTADOS_CHAT = new Set(["asignado", "llego", "en_curso"]);
const MAX_TEXTO = 500;

const chatsMemoria = new Map();

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

  const participa =
    userId === pasajeroId || userId === motoristaId;

  return participa ? viaje : null;
}

function serializarMensaje(mensaje) {
  return {
    id: mensaje.id,
    viajeId: mensaje.viajeId,
    senderId: mensaje.senderId,
    senderRole: mensaje.senderRole,
    senderName: mensaje.senderName || "",
    texto: mensaje.texto,
    clientId: mensaje.clientId || null,
    createdAt: mensaje.createdAt || new Date(),
  };
}

function emitirMensaje(io, viaje, mensaje) {
  const pasajeroId = viaje.pasajero?.toString();
  const motoristaId = viaje.motorista?.toString();

  io.to(`viaje-chat:${mensaje.viajeId}`)
    .to(`pasajero:${pasajeroId}`)
    .to(`motorista:${motoristaId}`)
    .emit("viaje:chat:mensaje", mensaje);
}

function obtenerHistorial(viajeId) {
  if (!chatsMemoria.has(viajeId)) {
    chatsMemoria.set(viajeId, []);
  }

  return chatsMemoria.get(viajeId);
}

function guardarMensajeMemoria(viajeId, mensaje) {
  const historial = obtenerHistorial(viajeId);

  historial.push(mensaje);

  // máximo 100 mensajes en RAM
  if (historial.length > 100) {
    historial.shift();
  }
}

function limpiarChatViaje(viajeId) {
  chatsMemoria.delete(String(viajeId));
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

      const historial = obtenerHistorial(String(viajeId));

      socket.emit("viaje:chat:history", {
        viajeId,
        mensajes: historial.map(serializarMensaje),
      });
    } catch (err) {
      console.error("❌ Error join chat viaje:", err);

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
          mensaje: "Mensaje no enviado",
        });
      }

      const userId = getUserId(socket);

      const senderRole =
        userId === viaje.motorista?.toString()
          ? "motorista"
          : "pasajero";

      const payload = {
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

        texto: mensajeLimpio,

        clientId: clientId || null,

        createdAt: new Date(),
      };

      guardarMensajeMemoria(String(viajeId), payload);

      emitirMensaje(io, viaje, payload);
    } catch (err) {
      console.error("❌ Error enviando chat viaje:", err);

      socket.emit("viaje:chat:error", {
        viajeId,
        mensaje: "No se pudo enviar el mensaje",
      });
    }
  });

  socket.on("viaje:chat:leave", ({ viajeId } = {}) => {
    if (viajeId) {
      socket.leave(`viaje-chat:${viajeId}`);
    }
  });

  // 🔥 LIMPIAR CHAT CUANDO TERMINA VIAJE
  const limpiarEventos = [
    "viaje-finalizado",
    "viaje:cancelado",
    "viaje-expirado",
  ];

  limpiarEventos.forEach((evento) => {
    socket.on(evento, ({ viajeId } = {}) => {
      if (!viajeId) return;

      limpiarChatViaje(String(viajeId));

      io.to(`viaje-chat:${viajeId}`).emit(
        "viaje:chat:closed",
        {
          viajeId,
        }
      );

      io.in(`viaje-chat:${viajeId}`).socketsLeave(
        `viaje-chat:${viajeId}`
      );
    });
  });
};

// export opcional para limpiar desde otros módulos
module.exports.limpiarChatViaje = limpiarChatViaje;