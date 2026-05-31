const jwt = require("jsonwebtoken");
const User = require("../models/User");

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
        // 1. Decodificamos sin verificar para saber quién es el usuario
        const payloadInseguro = jwt.decode(token);
        
        if (payloadInseguro && payloadInseguro.id) {
          const userCheck = await User.findById(payloadInseguro.id).lean();
          
          // 2. Condición especial: Si es pasajero y está en un viaje activo
          // Nota: Asegúrate de que 'estado' o 'enViaje' sea el campo correcto en tu modelo
          if (userCheck && userCheck.rol === "pasajero" && userCheck.enViaje === true) {
            console.log(`⏳ Token expirado pero usuario ${userCheck.nombre} está en viaje. Permitiendo conexión.`);
            decoded = payloadInseguro; // Bypass de expiración
          } else {
            console.warn("⛔ Token expirado y usuario no está activo");
            socket.emit("auth-expired");
            return socket.disconnect(true);
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

    if (user.tokenVersion !== decoded.tokenVersion) {
      console.warn("⛔ Token desactualizado");
      return next(new Error("Token outdated"));
    }

    if (user.saldoBloqueado) {
      console.warn("⛔ Usuario saldoBloqueado:", user._id.toString());
      return next(new Error("User blocked"));
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