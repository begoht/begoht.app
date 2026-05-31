const finalizarViaje = require(
    "../../../../services/finalizarViaje.service"
);

module.exports = (io, socket) => {
    return async ({ viajeId }) => {
        await finalizarViaje({
            io,
            socket,
            viajeId,
            motoristaId: socket.user._id.toString()
        });
    };
};