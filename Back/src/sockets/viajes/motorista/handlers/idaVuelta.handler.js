function iniciarRetornoHandler(io, socket) {
  return async ({ viajeId } = {}) => {
    socket.emit("error-operacion", {
      code: "IDA_VUELTA_SOLO_PASAJERO",
      msg: "La vuelta se inicia automaticamente si el pasajero la eligio al confirmar el precio.",
      viajeId
    });
  };
}

function anularRetornoHandler(io, socket) {
  return async ({ viajeId, lat, lng } = {}) => {
    socket.emit("error-operacion", {
      code: "IDA_VUELTA_SOLO_PASAJERO",
      msg: "La vuelta solo puede cambiarse desde la app del pasajero.",
      viajeId
    });
  };
}

module.exports = {
  iniciarRetornoHandler,
  anularRetornoHandler
};
