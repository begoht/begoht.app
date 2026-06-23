const finalizarViaje = require("../../../../services/finalizarViaje.service");
const {
  anularRetorno,
  iniciarRetorno,
} = require("../../../../services/idaVuelta.service");

function iniciarRetornoHandler(io, socket) {
  return async ({ viajeId } = {}) => {
    try {
      const motoristaId = socket.user._id.toString();

      if (!viajeId) {
        return socket.emit("error-operacion", {
          code: "IDA_VUELTA_SIN_VIAJE",
          msg: "No hay viaje para iniciar la vuelta."
        });
      }

      await iniciarRetorno({
        io,
        socket,
        viajeId,
        motoristaId
      });
    } catch (error) {
      console.error("Error iniciar retorno:", error);
      socket.emit("error-operacion", {
        code: error.code || "IDA_VUELTA_ERROR",
        msg: error.message || "No se pudo iniciar la vuelta."
      });
    }
  };
}

function anularRetornoHandler(io, socket) {
  return async ({ viajeId, lat, lng } = {}) => {
    try {
      const motoristaId = socket.user._id.toString();

      if (!viajeId) {
        return socket.emit("error-operacion", {
          code: "IDA_VUELTA_SIN_VIAJE",
          msg: "No hay viaje para anular la vuelta."
        });
      }

      const idaVuelta = await anularRetorno({
        viajeId,
        motoristaId,
        canceladoPor: "pasajero"
      });

      io.to(`viaje:${viajeId}`)
        .to(`motorista:${motoristaId}`)
        .to(`track:${viajeId}`)
        .emit("ida-vuelta:retorno-anulado", {
          viajeId,
          idaVuelta,
          mensaje: "Vuelta anulada. Se cobrara solo la ida."
        });

      await finalizarViaje({
        io,
        socket,
        viajeId,
        lat,
        lng,
        motoristaId,
        source: "motorista",
        motivo: "retorno_cancelado",
        enforceProximity: false,
        enforceDeliveryCode: true
      });
    } catch (error) {
      console.error("Error anular retorno:", error);
      socket.emit("error-finalizar", {
        code: error.code || "IDA_VUELTA_ERROR",
        msg: error.message || "No se pudo anular la vuelta.",
        viajeId
      });
    }
  };
}

module.exports = {
  iniciarRetornoHandler,
  anularRetornoHandler
};
