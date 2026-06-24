const { redis } = require("../../../../config/redis");

const aceptarViajeService = require("../services/aceptarViaje.service");
const obtenerMotoristaInfo = require("../services/motoristaInfo.service");
const snapshotMotorista = require("../services/motoristaSnapshot.service");
const calcularETA = require("../../pasajeros/services/tracking/calcularETA");
const { getDriverEarningsForViaje } = require("../../../../services/driverEarnings.service");
const { prepararIdaVueltaPayload } = require("../../../../services/idaVuelta.service");

module.exports = (io, socket) => {
    return async ({ viajeId }) => {
        if (!viajeId || !redis) {
            return socket.emit("error-operacion");
        }

        const motoristaId = socket.user._id.toString();

        const lockKey = `lock:socket_aceptar:${motoristaId}`;
        const lockValue = String(viajeId);

        try {
            const lock = await redis.set(
                lockKey,
                lockValue,
                "NX",
                "PX",
                5000
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

                if (["OFERTA_EXPIRADA", "OFERTA_INVALIDA"].includes(result.error)) {
                    return socket.emit("viaje:oferta-cerrada", { viajeId });
                }

                if (["motorista_offline", "motorista_no_disponible"].includes(result.error)) {
                    socket.emit("viaje:oferta-cerrada", { viajeId });
                    return socket.emit("error-operacion", {
                        code: result.error,
                        msg: "Passe en ligne pour recevoir et accepter des courses."
                    });
                }

                if (result.error === "commission_limit_reached") {
                    socket.emit("driver:commission-blocked", {
                        viajeId,
                        ...(result.commissionStatus || {})
                    });
                    return socket.emit("error-operacion", {
                        code: "COMMISSION_LIMIT_REACHED",
                        msg: "Commission BeGO pendiente. Paga tu comision para recibir nuevos viajes."
                    });
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

            const viajeMotorista = await prepararViajeMotorista(result.viaje);

            if (result.estadoAsignado === "asignado") {
                socket.join(`viaje:${viajeId}`);

                socket.emit("viaje-confirmado-motorista", {
                    viaje: viajeMotorista
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
                        tipo: result.viaje.tipo || "viaje",
                        idaVuelta: prepararIdaVueltaPayload(result.viaje),
                        paquete: prepararPaquetePasajero(result.viaje),
                        motorista: motoristaInfo,
                        timestamp: Date.now()
                    }
                );

                emitirTrackInicialPasajero(io, result.viaje, motoristaInfo, "asignado");
            } else {
                socket.emit("viaje-siguiente-confirmado", {
                    viaje: viajeMotorista
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
                        tipo: result.viaje.tipo || "viaje",
                        idaVuelta: prepararIdaVueltaPayload(result.viaje),
                        paquete: prepararPaquetePasajero(result.viaje),
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
            await redis.eval(
                `
                    if redis.call('get', KEYS[1]) == ARGV[1] then
                        return redis.call('del', KEYS[1])
                    end

                    return 0
                `,
                1,
                lockKey,
                lockValue
            );
        }
    };
};

function prepararPaqueteMotorista(viaje) {
    if ((viaje.tipo || "viaje") !== "envio" || !viaje.paquete) return null;

    return {
        pesoKg: viaje.paquete.pesoKg,
        descripcion: viaje.paquete.descripcion || "",
        instrucciones: viaje.paquete.instrucciones || "",
        codigoEntregaRequerido: true
    };
}

function prepararPaquetePasajero(viaje) {
    if ((viaje.tipo || "viaje") !== "envio" || !viaje.paquete) return null;

    return {
        pesoKg: viaje.paquete.pesoKg,
        descripcion: viaje.paquete.descripcion || "",
        instrucciones: viaje.paquete.instrucciones || "",
        codigoEntrega: viaje.paquete.codigoEntrega || null
    };
}

async function prepararViajeMotorista(viaje) {
    const raw = typeof viaje.toObject === "function" ? viaje.toObject() : { ...viaje };
    const earnings = await getDriverEarningsForViaje(raw);
    return {
        ...raw,
        ...earnings,
        idaVuelta: prepararIdaVueltaPayload(raw),
        paquete: prepararPaqueteMotorista(viaje)
    };
}

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
        idaVuelta: prepararIdaVueltaPayload(viaje),
        distancia: calc.distanciaKm ?? null,
        eta: calc.eta ?? null,
        immediate: true,
        timestamp: Date.now()
    });
}
