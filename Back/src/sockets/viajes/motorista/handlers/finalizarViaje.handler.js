const finalizarViaje = require(
    "../../../../services/finalizarViaje.service"
);

module.exports = (io, socket) => {
    return async ({ viajeId, codigoEntrega, lat, lng }) => {
        await finalizarViaje({
            io,
            socket,
            viajeId,
            codigoEntrega,
            lat,
            lng,
            motoristaId: socket.user._id.toString()
        });
    };
};
