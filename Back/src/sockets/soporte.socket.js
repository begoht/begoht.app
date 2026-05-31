// ⚠️ memoria simple (puede ir a Redis luego)
const usuariosSoporte = new Map();

module.exports = (io, socket) => {
  /*********************************
   * UNIRSE A SOPORTE
   *********************************/
  socket.on("soporte:join", () => {
    if (!socket.user) return;

    const userId = socket.user._id.toString();
    const room = `soporte_${userId}`;

    socket.join(room);

    // guardar usuario en memoria
    usuariosSoporte.set(userId, {
      _id: userId,
      nombre: socket.user.nombre,
      rol: socket.user.rol
    });

    console.log("🎧 Usuario en soporte:", socket.user.nombre);

    // 🔥 enviar lista de usuarios a todos los admins conectados
    io.emit("soporte:usuarios", Array.from(usuariosSoporte.values()));
  });

  /*********************************
   * MENSAJES
   *********************************/
  socket.on("soporte:mensaje", (data = {}) => {
    if (!socket.user) return;

    const { mensaje, userId } = data;
    if (!mensaje) return;

    let room, from;

    // 👤 USUARIO NORMAL
    if (socket.user.rol === "pasajero") {
      room = `soporte_${socket.user._id}`;
      from = "usuario";
    }

    // 🧑‍💼 ADMIN SOPORTE
    if (socket.user.rol === "admin") {
      if (!userId) return;
      room = `soporte_${userId}`;
      from = "soporte";
    }

    if (!room) return;

    // enviar mensaje a la sala correspondiente
    io.to(room).emit("soporte:mensaje", {
      mensaje,
      from,
      nombre: socket.user.nombre,
      userId: socket.user._id
    });

    console.log(`💬 ${from} | ${socket.user.nombre}: ${mensaje}`);
  });

  /*********************************
   * DESCONECTAR
   *********************************/
  socket.on("disconnect", () => {
    if (!socket.user) return;

    const userId = socket.user._id.toString();
    usuariosSoporte.delete(userId);

    console.log("🔌 Salió de soporte:", socket.user.nombre);

    // actualizar lista de usuarios a todos los admins
    io.emit("soporte:usuarios", Array.from(usuariosSoporte.values()));
  });
};
