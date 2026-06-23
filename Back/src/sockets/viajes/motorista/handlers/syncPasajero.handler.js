const Viaje = require("../../../../models/Viaje");
const { prepararIdaVueltaPayload } = require("../../../../services/idaVuelta.service");

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
                destino: viaje.destino,
                precio: viaje.precio,
                precioBase: viaje.precioBase || viaje.precio,
                descuentoWallet: viaje.descuentoWallet || 0,
                descuentoWalletRate: viaje.descuentoWalletRate || 0,
                distanciaKm: viaje.distanciaKm,
                duracionMin: viaje.duracionMin,
                metodoPago: viaje.metodoPago,
                estadoPago: viaje.estadoPago,
                tipo: viaje.tipo || "viaje",
                idaVuelta: prepararIdaVueltaPayload(viaje)
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
