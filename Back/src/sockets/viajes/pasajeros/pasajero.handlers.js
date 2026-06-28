const pedirHandler = require("./handlers/pedir.handler");
const confirmarHandler = require("./handlers/confirmar.handler");
const cancelarHandler = require("./handlers/cancelar.handler");
const {
  anularRetornoPasajeroHandler,
  iniciarRetornoPasajeroHandler
} = require("./handlers/idaVuelta.handler");
const replayService = require("./services/replay.service");
const viewportMotoristas = require("./pasajero.viewport");
const limpiar = require("./services/limpiar.service")

module.exports = function(io, socket) {

  if (socket._pasajeroEventsRegistered) return;
  socket._pasajeroEventsRegistered = true;

  socket.on("pedir-viaje", data => {
    pedirHandler(socket, io, data);
  });

  socket.on("confirmar-viaje", data => {
    confirmarHandler(socket, io, data);
  });

  socket.on("cancelar-viaje", data => {
    cancelarHandler(socket, io, data);
  });

  socket.on("ida-vuelta:iniciar-retorno", iniciarRetornoPasajeroHandler(io, socket));
  socket.on("ida-vuelta:anular-retorno", anularRetornoPasajeroHandler(io, socket));

  socket.on("sync-pasajero", (payload = {}) => {
    replayService(socket, payload);
  });

  process.nextTick(() => {
    replayService(socket);
  });

  viewportMotoristas(io, socket);
};
