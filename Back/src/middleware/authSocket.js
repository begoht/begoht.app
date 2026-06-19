const jwt = require("jsonwebtoken");
const User = require("../models/User");

function activeTripTokenGraceSeconds() {
  const value = Number(process.env.ACTIVE_TRIP_TOKEN_GRACE_SECONDS ?? 900);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, 3600);
}

function tokenInsideGrace(decoded) {
  if (!decoded?.exp) return false;
  const expiredFor = Math.floor(Date.now() / 1000) - Number(decoded.exp);
  return expiredFor >= 0 && expiredFor <= activeTripTokenGraceSeconds();
}

module.exports = async (socket, next) => {
  try {
    console.log("🔐 AUTH SOCKET INICIADO");

    /*************************************************
     * 🎫 OBTENER TOKEN (MULTIPLE ORIGEN)
     *************************************************/
    const rawToken =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization;

    if (!rawToken) {
      console.warn("⛔ Socket sin token");
      return next(new Error("No token provided"));
    }

    const token = rawToken.startsWith("Bearer ")
      ? rawToken.slice(7)
      : rawToken;

    /*************************************************
     * 🔎 VERIFICAR JWT
     *************************************************/
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        // Firma valida, expiracion ignorada solo para una gracia corta de viaje activo.
        let expiredPayload;
        try {
          expiredPayload = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        } catch (verifyErr) {
          console.warn("Token expirado con firma invalida:", verifyErr.message);
          return next(new Error("Invalid token"));
        }

        if (!tokenInsideGrace(expiredPayload)) {
          console.warn("Token expirado fuera del margen de gracia");
          return next(new Error("Token expired"));
        }
        
        if (expiredPayload && expiredPayload.id) {
          const userCheck = await User.findById(expiredPayload.id).lean();
          
          // 2. Condición especial: Si es pasajero y está en un viaje activo
          // Nota: Asegúrate de que 'estado' o 'enViaje' sea el campo correcto en tu modelo
          if (userCheck && userCheck.rol === "pasajero" && userCheck.enViaje === true) {
            console.log(`⏳ Token expirado pero usuario ${userCheck.nombre} está en viaje. Permitiendo conexión.`);
            decoded = expiredPayload;
          } else {
            console.warn("⛔ Token expirado y usuario no está activo");
            return next(new Error("Token expired"));
          }
        } else {
          return next(new Error("Invalid token payload"));
        }
      } else {
        console.warn("⛔ Token inválido:", err.message);
        return next(new Error("Invalid token"));
      }
    }

    /*************************************************
     * 👤 BUSCAR USUARIO
     *************************************************/
    const user = await User.findById(decoded.id).lean();

    if (!user) {
      console.warn("⛔ Usuario no encontrado");
      return next(new Error("User not found"));
    }

    if (user.deletedAt || user.activo === false) {
      return next(new Error("User account inactive"));
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      console.warn("⛔ Token desactualizado");
      return next(new Error("Token outdated"));
    }

    if (user.saldoBloqueado) {
      console.warn("⛔ Usuario saldoBloqueado:", user._id.toString());
      return next(new Error("User blocked"));
    }

    if (user.rol === "motorista" && user.verificado !== true) {
      console.warn("Motorista pendiente de verificacion:", user._id.toString());
      const error = new Error("Driver verification required");
      error.data = { code: "DRIVER_PENDING_VERIFICATION" };
      return next(error);
    }

    const userId = user._id.toString();

    /*************************************************
     * 🔥 SETEO SEGURO DE SESIÓN SOCKET
     *************************************************/
    socket.user = {
      id: userId,
      _id: user._id,
      nombre: user.nombre,
      rol: user.rol,
      verificado: user.verificado === true,
    };

    socket.data.userId = userId;
    socket.data.role = user.rol;
    socket.data.nombre = user.nombre;

    /*************************************************
     * 🚀 ROOMS PRIVADAS (ARQUITECTURA ESCALABLE)
     *************************************************/

    // Room universal (siempre)
    socket.join(`user:${userId}`);

    // Room por rol
    switch (user.rol) {
      case "motorista":
        socket.join(`motorista:${userId}`);
        console.log(`🛵 Motorista unido a: motorista:${userId}`);
        break;

      case "pasajero":
        socket.join(`pasajero:${userId}`);
        console.log(`🧍 Pasajero unido a: pasajero:${userId}`);
        break;

      case "admin":
        socket.join(`admin:${userId}`);
        console.log(`🛡 Admin unido a: admin:${userId}`);
        break;
    }

    const activeSockets = global.activeSockets;
    
    if (activeSockets) {
      const previousSocketId = activeSockets.get(userId);
      
      if (previousSocketId && previousSocketId !== socket.id) {
        const oldSocket = global.io?.sockets?.sockets?.get(previousSocketId);
        if (oldSocket) {
          console.log("⚠️ Cerrando socket anterior:", previousSocketId);
          oldSocket.emit("sesion-reemplazada");
          oldSocket.disconnect(true);
        }
      }
      
      activeSockets.set(userId, socket.id);
      
      socket.on("disconnect", () => {
        if (activeSockets.get(userId) === socket.id) {
          activeSockets.delete(userId);
        }
      });
    }

    /*************************************************
     * 📡 DEBUG OPCIONAL (PRODUCCIÓN CONTROLADA)
     *************************************************/
    if (process.env.NODE_ENV !== "production") {
      const eventosImportantes = [
        "motorista-aceptar-viaje",
        "motorista-rechazar-viaje",
        "pedir-viaje",
        "confirmar-viaje",
        "iniciar-viaje",
        "finalizar-viaje"
      ];
      
      socket.onAny((event) => {
        if (!eventosImportantes.includes(event)) return;
        
        console.log(
          `📡 [${user.rol}] ${user.nombre} →`,
          event
        );
      });
    }

    console.log(
      `✅ Socket autenticado: ${user.nombre} | Rol: ${user.rol}`
    );

    return next();

  } catch (err) {
    console.error("💥 authSocket CRASH:", err);
    return next(new Error("Socket authentication failed"));
  }
};

/*************************************************
 * 🔎 BUSCAR USUARIO POR ALIAS
 *************************************************/
module.exports.buscarPorAlias = async (req, res) => {
  const { alias } = req.params;

  try {
    const user = await User.findOne({ alias: alias.toLowerCase() })
      .select("nombre alias _id foto");

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error al buscar usuario" });
  }
};
