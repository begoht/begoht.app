const Viaje = require("../../../../models/Viaje");
const finalizarViaje = require("../../../../services/finalizarViaje.service");
const {
  anularRetorno,
  iniciarRetorno
} = require("../../../../services/idaVuelta.service");

function iniciarRetornoPasajeroHandler(io, socket) {
  return async ({ viajeId } = {}) => {
    try {
      const pasajeroId = (socket.user.id || socket.user._id).toString();
      const viaje = await buscarViajeRetornoPendiente({ pasajeroId, viajeId });

      if (!viaje?.motorista) {
        return socket.emit("viaje-error", {
          code: "IDA_VUELTA_NO_PENDIENTE",
          mensaje: "La vuelta no esta pendiente para este viaje."
        });
      }

      await iniciarRetorno({
        io,
        socket,
        viajeId: viaje._id.toString(),
        motoristaId: viaje.motorista.toString()
      });
    } catch (error) {
      console.error("Error iniciar retorno pasajero:", error);
      socket.emit("viaje-error", {
        code: error.code || "IDA_VUELTA_ERROR",
        mensaje: error.message || "No se pudo iniciar la vuelta."
      });
    }
  };
}

function anularRetornoPasajeroHandler(io, socket) {
  return async ({ viajeId } = {}) => {
    try {
      const pasajeroId = (socket.user.id || socket.user._id).toString();
      const viaje = await buscarViajeRetornoPendiente({ pasajeroId, viajeId });

      if (!viaje?.motorista) {
        return socket.emit("viaje-error", {
          code: "IDA_VUELTA_NO_PENDIENTE",
          mensaje: "La vuelta no esta pendiente para anular."
        });
      }

      const id = viaje._id.toString();
      const motoristaId = viaje.motorista.toString();
      const idaVuelta = await anularRetorno({
        viajeId: id,
        motoristaId,
        canceladoPor: "pasajero"
      });

      io.to(`viaje:${id}`)
        .to(`motorista:${motoristaId}`)
        .to(`track:${id}`)
        .to(`pasajero:${pasajeroId}`)
        .emit("ida-vuelta:retorno-anulado", {
          viajeId: id,
          idaVuelta,
          mensaje: "Vuelta anulada. Se cobrara solo la ida."
        });

      await finalizarViaje({
        io,
        socket,
        viajeId: id,
        motoristaId,
        source: "motorista",
        motivo: "retorno_cancelado",
        enforceProximity: false,
        enforceDeliveryCode: true
      });
    } catch (error) {
      console.error("Error anular retorno pasajero:", error);
      socket.emit("viaje-error", {
        code: error.code || "IDA_VUELTA_ERROR",
        mensaje: error.message || "No se pudo anular la vuelta."
      });
    }
  };
}

function buscarViajeRetornoPendiente({ pasajeroId, viajeId }) {
  const query = {
    pasajero: pasajeroId,
    estado: "en_curso",
    "idaVuelta.solicitada": true,
    "idaVuelta.estado": "retorno_pendiente"
  };

  if (viajeId) {
    query._id = viajeId;
  }

  return Viaje.findOne(query)
    .select("_id motorista")
    .lean();
}

module.exports = {
  iniciarRetornoPasajeroHandler,
  anularRetornoPasajeroHandler
};
