module.exports = (socket, next) => {
  const role = socket.handshake.auth?.role;

  socket.user = {
    id: socket.id,
    nombre: role === "pasajero" ? "Pasajero" : "Motorista",
    rol: role === "pasajero" ? "pasajero" : "motorista",
  };

  next();
};
