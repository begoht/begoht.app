const Viaje = require("../../../../models/Viaje");

module.exports = (io, socket) => {
    return async () => {
        try {
            const viaje = await Viaje.findOne({
                pasajero: socket.user._id,
                estado: {
                    $in: [
                        "asignado",
                        "llego",
                        "en_curso"
                    ]
                }
            }).lean();

            if (!viaje) {
                return socket.emit("viaje-sync", {
                    activo: false
                });
            }

            socket.emit("viaje-sync", {
                activo: true,
                viajeId: viaje._id,
                estado: viaje.estado,
                motorista: viaje.motorista,
                origen: viaje.origen,
                destino: viaje.destino
            });
        } catch (err) {
            console.error(
                "❌ sync pasajero:",
                err
            );

            socket.emit("viaje-sync", {
                activo: false
            });
        }
    };
};