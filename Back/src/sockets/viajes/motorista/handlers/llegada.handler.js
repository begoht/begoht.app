const Viaje = require("../../../../models/Viaje");
const { redis } = require("../../../../config/redis");
const { actualizarSnapshotMotorista } = require("../motoristaSnapshot.service");

const snapshotMotorista = require(
    "../services/motoristaSnapshot.service"
);

const updateContext = require(
    "../services/viajeContext.service"
);

module.exports = (io, socket) => {
    return async ({ viajeId }) => {
        try {
            const motoristaId = socket.user._id.toString();

            const snap = await snapshotMotorista(motoristaId);

            if (snap?.viajeActualId !== viajeId) {
                return socket.emit("error-operacion");
            }

            const viaje = await Viaje.findOneAndUpdate(
                {
                    _id: viajeId,
                    motorista: motoristaId,
                    estado: "asignado"
                },
                {
                    $set: {
                        estado: "llego",
                        motoristaLlegado: true,
                        llegadaAt: new Date()
                    }
                },
                {
                    new: true
                }
            );

            if (!viaje) return;

            await updateContext(viajeId, {
                estado: "llego",
                origen: viaje.origen,
                destino: viaje.destino,
                proximoDestino: viaje.origen,
                motoristaId
            });

            await actualizarSnapshotMotorista(motoristaId, {
                estadoInterno: "llego",
                estadoViaje: "llego"
            });

            await redis.hset(
                `motorista:data:${motoristaId}`,
                "estadoInterno",
                "llego"
            );

            socket.emit("confirmacion-llegada", {
                success: true
            });

            io.to(`pasajero:${viaje.pasajero}`).emit(
                "viaje:motorista-llego",
                {
                    viajeId
                }
            );
        } catch (error) {
            console.error("❌ llegada:", error);
        }
    };
};
