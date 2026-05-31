const { redis } = require("../../../../config/redis");

const aceptarViajeService = require("../services/aceptarViaje.service");
const obtenerMotoristaInfo = require("../services/motoristaInfo.service");
const snapshotMotorista = require("../services/motoristaSnapshot.service");
const calcularETA = require("../../pasajeros/services/tracking/calcularETA");

module.exports = (io, socket) => {
    return async ({ viajeId }) => {
        if (!viajeId || !redis) {
            return socket.emit("error-operacion");
        }

        const motoristaId = socket.user._id.toString();

        const lockKey = `lock:socket_aceptar:${viajeId}:${motoristaId}`;

        try {
            const lock = await redis.set(
                lockKey,
                "1",
                "NX",
                "PX",
                3000
            );

            if (!lock) return;

            const result = await aceptarViajeService({
                viajeId,
                motoristaId,
                socketId: socket.id,
                io
            });

            if (!result.success) {
                if (result.error === "cola_llena") {
                    return socket.emit("cola-ocupada");
                }

                return socket.emit(
                    result.error === "YA_TOMADO"
                        ? "viaje-ya-tomado"
                        : "error-operacion"
                );
            }

            const motoristaInfo = await obtenerMotoristaInfo(
                motoristaId,
                socket
            );
            const snapshot = await snapshotMotorista(motoristaId);

            if (snapshot?.lat != null && snapshot?.lng != null) {
                motoristaInfo.lat = Number(snapshot.lat);
                motoristaInfo.lng = Number(snapshot.lng);
            }

            if (result.estadoAsignado === "asignado") {
                socket.join(`viaje:${viajeId}`);

                socket.emit("viaje-confirmado-motorista", {
                    viaje: result.viaje
                });

                io.to(`pasajero:${result.viaje.pasajero}`).emit(
                    "viaje-asignado",
                    {
                        viajeId: result.viaje._id,
                        estado: "asignado",
                        origen: result.viaje.origen,
                        destino: result.viaje.destino,
                        precio: result.viaje.precio,
                        distanciaKm: result.viaje.distanciaKm,
                        duracionMin: result.viaje.duracionMin,
                        metodoPago: result.viaje.metodoPago,
                        estadoPago: result.viaje.estadoPago,
                        motorista: motoristaInfo,
                        timestamp: Date.now()
                    }
                );

                emitirTrackInicialPasajero(io, result.viaje, motoristaInfo, "asignado");
            } else {
                socket.emit("viaje-siguiente-confirmado", {
                    viaje: result.viaje
                });

                io.to(`pasajero:${result.viaje.pasajero}`).emit(
                    "viaje-asignado",
                    {
                        viajeId: result.viaje._id,
                        estado: "reservado",
                        origen: result.viaje.origen,
                        destino: result.viaje.destino,
                        precio: result.viaje.precio,
                        distanciaKm: result.viaje.distanciaKm,
                        duracionMin: result.viaje.duracionMin,
                        metodoPago: result.viaje.metodoPago,
                        estadoPago: result.viaje.estadoPago,
                        motorista: motoristaInfo,
                        proximoDestino: result.proximoDestino || null,
                        timestamp: Date.now(),
                        mensaje:
                            "Tu motorista está terminando un viaje y ya tiene tu reserva."
                    }
                );

                emitirTrackInicialPasajero(
                    io,
                    result.viaje,
                    motoristaInfo,
                    "reservado",
                    result.proximoDestino || null
                );
            }
        } catch (error) {
            console.error("❌ aceptar handler:", error);
            socket.emit("error-operacion");
        } finally {
            await redis.del(lockKey);
        }
    };
};

function emitirTrackInicialPasajero(io, viaje, motoristaInfo, estado, proximoDestinoReserva = null) {
    if (
        !motoristaInfo ||
        motoristaInfo.lat == null ||
        motoristaInfo.lng == null
    ) {
        return;
    }

    const target = estado === "reservado" ? proximoDestinoReserva : viaje.origen;
    const calc = target
        ? calcularETA({
            motoristaLat: motoristaInfo.lat,
            motoristaLng: motoristaInfo.lng,
            destinoLat: target.lat,
            destinoLng: target.lng
        })
        : {};

    io.to(`pasajero:${viaje.pasajero}`).emit("track:posicion", {
        viajeId: viaje._id,
        lat: motoristaInfo.lat,
        lng: motoristaInfo.lng,
        estado,
        origen: viaje.origen || null,
        destino: viaje.destino || null,
        proximoDestino: target,
        distancia: calc.distanciaKm ?? null,
        eta: calc.eta ?? null,
        immediate: true,
        timestamp: Date.now()
    });
}
