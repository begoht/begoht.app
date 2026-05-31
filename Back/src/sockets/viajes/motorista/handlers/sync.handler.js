const Viaje = require("../../../../models/Viaje");
const { redis } = require("../../../../config/redis");

const snapshotMotorista = require(
    "../services/motoristaSnapshot.service"
);

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

                socket.emit(
                    "sync-viaje",
                    snapViaje
                        ? JSON.parse(snapViaje)
                        : await Viaje.findById(
                              snapshot.viajeActualId
                          ).lean()
                );
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