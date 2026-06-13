const Viaje = require("../../../../models/Viaje");
const { redis } = require("../../../../config/redis");
const { actualizarSnapshotMotorista } = require("../motoristaSnapshot.service");
const snapshotMotorista = require("../services/motoristaSnapshot.service");
const updateContext = require("../services/viajeContext.service");
const {
    ARRIVAL_MAX_DISTANCE_METERS,
    validarCercaniaMotorista
} = require("../../../../services/tripProximity.service");

module.exports = (io, socket) => {
    return async ({ viajeId, lat, lng } = {}) => {
        try {
            const motoristaId = socket.user._id.toString();
            const snap = await snapshotMotorista(motoristaId);

            if (snap?.viajeActualId !== viajeId) {
                return socket.emit("error-operacion");
            }

            const viaje = await Viaje.findOne({
                _id: viajeId,
                motorista: motoristaId,
                estado: "asignado"
            });

            if (!viaje) return;

            await validarCercaniaMotorista({
                motoristaId,
                target: viaje.origen,
                fallbackPosition: { lat, lng },
                maxDistanceMeters: ARRIVAL_MAX_DISTANCE_METERS,
                code: "DISTANCIA_ORIGEN",
                message: "Estas lejos del punto de recogida. Acercate para avisar llegada."
            });

            viaje.estado = "llego";
            viaje.motoristaLlegado = true;
            viaje.llegadaAt = new Date();
            await viaje.save();

            await updateContext(viajeId, {
                estado: "llego",
                origen: viaje.origen,
                destino: viaje.destino,
                proximoDestino: viaje.origen,
                motoristaId,
                pasajeroId: viaje.pasajero?.toString() || null
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
            if (String(error?.code || "").startsWith("DISTANCIA_")) {
                return socket.emit("error-operacion", {
                    code: error.code,
                    msg: error.message,
                    distanciaMetros: error.distanciaMetros,
                    maxDistanceMeters: error.maxDistanceMeters
                });
            }

            console.error("Error llegada:", error);
        }
    };
};
