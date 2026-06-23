const Viaje = require("../../../../models/Viaje");
const { redis } = require("../../../../config/redis");

const snapshotMotorista = require(
    "../services/motoristaSnapshot.service"
);
const { getDriverEarningsForViaje } = require("../../../../services/driverEarnings.service");
const { prepararIdaVueltaPayload } = require("../../../../services/idaVuelta.service");

module.exports = (io, socket) => {
    return async () => {
        try {
            const motoristaId = socket.user._id.toString();

            const snapshot = await snapshotMotorista(
                motoristaId
            );

            if (!snapshot) {
                return socket.emit("sync-viaje", {
                    estado: "libre"
                });
            }

            if (snapshot.viajeActualId) {
                const snapViaje = await redis.get(
                    `viaje:snapshot:${snapshot.viajeActualId}`
                );

                const viaje = snapViaje
                    ? JSON.parse(snapViaje)
                    : await Viaje.findById(
                          snapshot.viajeActualId
                      ).lean();

                socket.emit("sync-viaje", await sanitizarViajeMotorista(viaje));
            }

            if (
                snapshot.viajeReservadoId &&
                snapshot.viajeReservadoId !== "null"
            ) {
                socket.emit("sync-reserva", {
                    viajeId: snapshot.viajeReservadoId
                });
            }
        } catch (error) {
            console.error("❌ sync:", error);
        }
    };
};

async function sanitizarViajeMotorista(viaje) {
    if (!viaje) {
        return viaje;
    }

    const earnings = await getDriverEarningsForViaje(viaje);
    if ((viaje.tipo || "viaje") !== "envio" || !viaje.paquete) {
        return {
            ...viaje,
            idaVuelta: prepararIdaVueltaPayload(viaje),
            ...earnings
        };
    }

    return {
        ...viaje,
        idaVuelta: prepararIdaVueltaPayload(viaje),
        ...earnings,
        paquete: {
            pesoKg: viaje.paquete.pesoKg,
            descripcion: viaje.paquete.descripcion || "",
            instrucciones: viaje.paquete.instrucciones || "",
            codigoEntregaRequerido: true
        }
    };
}
