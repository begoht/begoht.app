const aceptarViajeHandler = require("./handlers/aceptarViaje.handler");
const rechazarViajeHandler = require("./handlers/rechazarViaje.handler");
const llegadaHandler = require("./handlers/llegada.handler");
const iniciarViajeHandler = require("./handlers/iniciarViaje.handler");
const finalizarViajeHandler = require("./handlers/finalizarViaje.handler");
const syncHandler = require("./handlers/sync.handler");
const syncPasajeroHandler = require("./handlers/syncPasajero.handler");
const {
    iniciarRetornoHandler,
    anularRetornoHandler
} = require("./handlers/idaVuelta.handler");

module.exports = (io, socket) => {
    if (!socket.user?._id) return;

    socket.on(
        "motorista-aceptar-viaje",
        aceptarViajeHandler(io, socket)
    );

    socket.on(
        "motorista-rechazar-viaje",
        rechazarViajeHandler(io, socket)
    );

    socket.on(
        "motorista-llego",
        llegadaHandler(io, socket)
    );

    socket.on(
        "iniciar-viaje",
        iniciarViajeHandler(io, socket)
    );

    socket.on(
        "finalizar-viaje",
        finalizarViajeHandler(io, socket)
    );

    socket.on(
        "ida-vuelta:iniciar-retorno",
        iniciarRetornoHandler(io, socket)
    );

    socket.on(
        "ida-vuelta:anular-retorno",
        anularRetornoHandler(io, socket)
    );

    socket.on(
        "sync-solicitado",
        syncHandler(io, socket)
    );

    socket.on(
        "sync-pasajero",
        syncPasajeroHandler(io, socket)
    );
};
