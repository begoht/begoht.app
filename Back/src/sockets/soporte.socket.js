const MAX_MENSAJE = 1000;

const ADMIN_ROOM = "soporte:admins";
const ACTIVE_USERS_ROOM = "soporte:usuarios-activos";

function getUserId(socket) {
  return socket.user?._id?.toString() || socket.user?.id?.toString();
}

function getNombre(socket) {
  return (
    [socket.user?.nombre, socket.user?.apellido].filter(Boolean).join(" ") ||
    socket.user?.nombre ||
    "BeGO"
  );
}

function roomUsuario(userId) {
  return `soporte:${userId}`;
}

function legacyRoomUsuario(userId) {
  return `soporte_${userId}`;
}

function limpiarMensaje(mensaje) {
  return String(mensaje || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MENSAJE);
}

function crearId(prefix = "support") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizarUsuario(socketData = {}) {
  const user = socketData.soporteUser;
  if (!user?.id) return null;

  return {
    _id: user.id,
    id: user.id,
    nombre: user.nombre || "Usuario BeGO",
    rol: user.rol || "usuario",
    connectedAt: user.connectedAt || new Date().toISOString(),
    online: true,
  };
}

async function obtenerUsuariosActivos(io) {
  const sockets = await io.in(ACTIVE_USERS_ROOM).fetchSockets();
  const usuarios = new Map();

  sockets.forEach((socket) => {
    const usuario = normalizarUsuario(socket.data || {});
    if (!usuario) return;

    const previo = usuarios.get(usuario.id);
    usuarios.set(usuario.id, {
      ...usuario,
      conexiones: (previo?.conexiones || 0) + 1,
    });
  });

  return Array.from(usuarios.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre)
  );
}

async function emitirUsuarios(io, targetSocket = null) {
  try {
    const usuarios = await obtenerUsuariosActivos(io);
    const target = targetSocket || io.to(ADMIN_ROOM);
    target.emit("soporte:usuarios", usuarios);
  } catch (err) {
    console.error("Error listando usuarios de soporte:", err);
  }
}

function emitirAUsuario(io, userId, eventName, payload) {
  io.to(roomUsuario(userId))
    .to(legacyRoomUsuario(userId))
    .emit(eventName, payload);
}

function emitirAConversacion(io, userId, eventName, payload) {
  emitirAUsuario(io, userId, eventName, payload);
  io.to(ADMIN_ROOM).emit(eventName, payload);
}

module.exports = (io, socket) => {
  if (socket._soporteRegistered) return;
  socket._soporteRegistered = true;

  socket.on("soporte:join", async () => {
    if (!socket.user) return;

    const userId = getUserId(socket);
    const rol = socket.user.rol;

    if (rol === "admin") {
      socket.join(ADMIN_ROOM);
      await emitirUsuarios(io, socket);
      socket.emit("soporte:estado", {
        online: true,
        rol,
        ephemeral: true,
      });
      return;
    }

    socket.join(ACTIVE_USERS_ROOM);
    socket.join(roomUsuario(userId));
    socket.join(legacyRoomUsuario(userId));
    socket.data.soporteUser = {
      id: userId,
      nombre: getNombre(socket),
      rol,
      connectedAt: new Date().toISOString(),
    };

    socket.emit("soporte:estado", {
      online: true,
      rol,
      ephemeral: true,
    });

    io.to(ADMIN_ROOM).emit("soporte:usuario-online", {
      _id: userId,
      id: userId,
      nombre: getNombre(socket),
      rol,
      online: true,
    });

    await emitirUsuarios(io);
  });

  socket.on("soporte:mensaje", async (data = {}, ack) => {
    try {
      if (!socket.user) return;

      const mensaje = limpiarMensaje(data.mensaje);
      const rol = socket.user.rol;
      const esAdmin = rol === "admin";
      const userId = esAdmin ? String(data.userId || "") : getUserId(socket);

      if (!mensaje || !userId) {
        if (typeof ack === "function") {
          ack({ ok: false, error: "Mensaje no valido" });
        }
        return;
      }

      const payload = {
        id: data.clientId || crearId(esAdmin ? "support-admin" : "support-user"),
        clientId: data.clientId || null,
        mensaje,
        from: esAdmin ? "soporte" : "usuario",
        nombre: getNombre(socket),
        userId,
        rol,
        createdAt: new Date().toISOString(),
        ephemeral: true,
      };

      emitirAConversacion(io, userId, "soporte:mensaje", payload);

      if (typeof ack === "function") {
        ack({ ok: true, id: payload.id, createdAt: payload.createdAt });
      }
    } catch (err) {
      console.error("Error enviando soporte:", err);

      if (typeof ack === "function") {
        ack({ ok: false, error: "No se pudo enviar" });
      }
    }
  });

  socket.on("soporte:typing", (data = {}) => {
    if (!socket.user) return;

    const esAdmin = socket.user.rol === "admin";
    const userId = esAdmin ? String(data.userId || "") : getUserId(socket);
    if (!userId) return;

    const payload = {
      userId,
      from: esAdmin ? "soporte" : "usuario",
      nombre: getNombre(socket),
      isTyping: Boolean(data.isTyping),
      ephemeral: true,
    };

    if (esAdmin) {
      emitirAUsuario(io, userId, "soporte:typing", payload);
    } else {
      io.to(ADMIN_ROOM).emit("soporte:typing", payload);
    }
  });

  socket.on("soporte:read", (data = {}) => {
    if (!socket.user) return;

    const esAdmin = socket.user.rol === "admin";
    const userId = esAdmin ? String(data.userId || "") : getUserId(socket);
    if (!userId) return;

    const payload = {
      userId,
      from: esAdmin ? "soporte" : "usuario",
      readAt: new Date().toISOString(),
      ephemeral: true,
    };

    if (esAdmin) {
      emitirAUsuario(io, userId, "soporte:read", payload);
    } else {
      io.to(ADMIN_ROOM).emit("soporte:read", payload);
    }
  });

  socket.on("soporte:alerta", (data = {}) => {
    if (socket.user?.rol !== "admin") return;

    const mensaje = limpiarMensaje(data.mensaje) || "Message important de BeGO";
    io.to(ACTIVE_USERS_ROOM).emit("soporte:alerta", {
      id: crearId("support-alert"),
      mensaje,
      from: "soporte",
      createdAt: new Date().toISOString(),
      ephemeral: true,
    });
  });

  socket.on("disconnect", async () => {
    try {
      if (!socket.user || socket.user.rol === "admin") return;

      const userId = getUserId(socket);
      const activos = await io.in(roomUsuario(userId)).fetchSockets();
      const sigueOnline = activos.some((activeSocket) => activeSocket.id !== socket.id);

      if (!sigueOnline) {
        io.to(ADMIN_ROOM).emit("soporte:usuario-offline", {
          _id: userId,
          id: userId,
          online: false,
        });
      }

      await emitirUsuarios(io);
    } catch (err) {
      console.error("Error desconectando soporte:", err);
    }
  });
};
