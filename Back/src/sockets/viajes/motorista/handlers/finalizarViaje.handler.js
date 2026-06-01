const finalizarViaje = require(
    "../../../../services/finalizarViaje.service"
);

module.exports = (io, socket) => {
    return async ({ viajeId, codigoEntrega }) => {
        await finalizarViaje({
            io,
            socket,
            viajeId,
            codigoEntrega,
            motoristaId: socket.user._id.toString()
        });
    };
};
