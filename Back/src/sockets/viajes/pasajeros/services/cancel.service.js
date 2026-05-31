const Viaje = require("../../../../models/Viaje");
const Wallet = require("../../../../models/Wallet");
const mongoose = require("mongoose");
const { redis } = require("../../../../config/redis");
const { viajesPendientes } = require("../state/viaje.state");
const limpiarMatching = require("../services/limpiar.service");
const { actualizarSnapshotMotorista } = require("../../motorista/motoristaSnapshot.service");
const { eliminarSnapshotPasajero } = require("../services/snapshotPasajero.service");

const ESTADOS_BUSQUEDA = ["buscando", "ofertando"];
const ESTADOS_CANCELABLES = ["buscando", "ofertando", "aceptado", "asignado", "reservado"];

async function cancelarViaje(socket, io, { viajeId }) {
    if (!viajeId) {
        return socket.emit("error", { mensaje: "viajeId requerido" });
    }

    const pasajeroId = socket.user.id;
    const lockKey = `lock:cancelar:${viajeId}`;
    const lockValue = `${Date.now()}-${pasajeroId}`;
    let lockAdquirido = false;
    let session;

    try {
        // 🔐 LOCK REDIS
        if (redis) {
            const lock = await redis.set(lockKey, lockValue, "NX", "PX", 15000);
            if (!lock) {
                return socket.emit("info", { mensaje: "Cancelación en proceso..." });
            }
            lockAdquirido = true;
        }

        // 🧾 SESSION
        session = await mongoose.startSession();
        session.startTransaction();

        const viaje = await Viaje.findOne({
            _id: viajeId,
            pasajero: pasajeroId,
            estado: { $in: ESTADOS_CANCELABLES }
        }).session(session);

        if (!viaje) {
            await session.abortTransaction();
            session.endSession();
            if (redis) {
                const status = await redis.get(`viaje:status:${viajeId}`);
                if (status === "cancelado" || status === "busqueda_anulada") {
                    return socket.emit("viaje:cancelado", {
                        viajeId,
                        penalidad: 0,
                        reembolso: 0,
                        busquedaAnulada: true
                    });
                }
            }
            return socket.emit("error", { mensaje: "Viaje no cancelable o ya en curso" });
        }

        // 💰 PENALIDAD
        const estadoAlCancelar = viaje.estado;
        const total = viaje.precio || 0;
        const base = viaje.escrow ?? total;

        let penalidad = 0;
        if (viaje.motoristaLlegado) {
            penalidad = base * 0.25;
        } else if (estadoAlCancelar === "asignado") {
            penalidad = base * 0.10;
        }

        const reembolso = Math.max(0, base - penalidad);

        // 💳 WALLET
        if (viaje.metodoPago === "wallet") {
            const wallet = await Wallet.findOne({ userId: pasajeroId }).session(session);
            if (!wallet) throw new Error("WALLET_NOT_FOUND");

            const bloqueado = Number(wallet.saldoBloqueado || 0);

            if (bloqueado >= base) {
                wallet.saldoBloqueado -= base;
                wallet.saldo += reembolso;
            } else if (bloqueado <= 0) {
                wallet.saldo += reembolso;
            } else {
                throw new Error("ESCROW_INCONSISTENTE");
            }

            wallet.movimientos.push({
                tipo: penalidad > 0 ? "cancelacion_con_penalidad" : "escrow_revertido",
                monto: reembolso,
                descripcion: penalidad > 0 ? "Cancelacion con penalidad" : "Escrow revertido",
                ref: `VIAJE-${viajeId}`,
                metadata: { penalidad, total: base },
                fecha: new Date()
            });

            await wallet.save({ session });
        }

        const esAnulacionBusqueda = ESTADOS_BUSQUEDA.includes(estadoAlCancelar);
        let updated;

        if (esAnulacionBusqueda) {
            updated = await Viaje.findOneAndDelete(
                {
                    _id: viajeId,
                    pasajero: pasajeroId,
                    estado: { $in: ESTADOS_BUSQUEDA },
                    motorista: null
                },
                { session }
            );
        } else {
            // 🔥 UPDATE ATÓMICO (FIX PRINCIPAL)
            updated = await Viaje.findOneAndUpdate(
                {
                    _id: viajeId,
                    pasajero: pasajeroId,
                    estado: { $in: ESTADOS_CANCELABLES }
                },
                {
                    $set: {
                        estado: "cancelado",
                        estadoPago: penalidad > 0 ? "penalizado" : "reembolsado",
                        cancelFee: penalidad,
                        canceladoEn: new Date(),
                        canceladoPor: "pasajero"
                    }
                },
                { new: true, session }
            );
        }

        if (!updated) {
            await session.abortTransaction();
            session.endSession();
            return socket.emit("error", { mensaje: "Viaje ya modificado por otro proceso" });
        }

        if (redis) {
            await redis.multi()
                .set(
                    `viaje:status:${viajeId}`,
                    esAnulacionBusqueda ? "busqueda_anulada" : "cancelado",
                    "EX",
                    120
                )
                .publish(`viaje:canal:${viajeId}`, JSON.stringify({
                    type: "cancelado",
                    estado: esAnulacionBusqueda ? "busqueda_anulada" : "cancelado",
                    viajeId
                }))
                .exec();
        }

        await session.commitTransaction();
        session.endSession();

        // 🧹 LIMPIAR MATCHING
        await limpiarMatching(viajeId);

        if (redis) {
            await redis.set(
                `viaje:status:${viajeId}`,
                esAnulacionBusqueda ? "busqueda_anulada" : "cancelado",
                "EX",
                120
            );
        }

        if (esAnulacionBusqueda) {
            await eliminarSnapshotPasajero(pasajeroId);

            if (viajesPendientes) {
                viajesPendientes.delete(socket.id);
            }

            socket.emit("viaje:cancelado", {
                viajeId,
                penalidad: 0,
                reembolso,
                busquedaAnulada: true
            });

            return;
        }

        const motoristaId = viaje.motorista ? viaje.motorista.toString() : null;

        if (motoristaId && redis) {

            await redis.del(`viaje:ofertando:${viajeId}`, `lock:viaje:${viajeId}`);

            if (estadoAlCancelar === "reservado") {

                await redis.del(`lock:cola:${motoristaId}`);

                await actualizarSnapshotMotorista(motoristaId, {
                    viajeReservadoId: "" 
                });

                io.to(`motorista:${motoristaId}`).emit("viaje-siguiente-cancelado", { viajeId });

            } else {

                const reserva = await Viaje.findOne({
                    motorista: motoristaId,
                    estado: "reservado"
                }).sort({ createdAt: 1 });

                if (reserva) {

                    reserva.estado = "asignado";
                    reserva.activadoDesdeReserva = true;
                    reserva.activadoEn = new Date();
                    await reserva.save();

                    await Promise.all([
                        actualizarSnapshotMotorista(motoristaId, {
                            viajeActualId: reserva._id.toString(),
                            viajeReservadoId: "",
                            estadoInterno: "viajando",
                            estadoViaje: "asignado"
                        }),
                        redis.multi()
                            .hset(`motorista:data:${motoristaId}`, 
                                "viajeActualId", reserva._id.toString(),
                                "estadoInterno", "viajando", 
                                "disponible", "false"
                            )
                            .del(`lock:cola:${motoristaId}`)
                            .exec()
                    ]);

                    await redis.set(
                        `viaje:ctx:${reserva._id}`,
                        JSON.stringify({
                            estado: "asignado",
                            origen: reserva.origen || null,
                            destino: reserva.destino || null,
                            proximoDestino: reserva.origen || null,
                            motoristaId
                        }),
                        "EX",
                        600
                    );

                    const motoristaRoom = `motorista:${motoristaId}`;
                    io.in(motoristaRoom).socketsJoin(`viaje:${reserva._id.toString()}`);
                    io.in(motoristaRoom).socketsLeave(`viaje:${viajeId}`);

                    io.to(`pasajero:${reserva.pasajero.toString()}`).emit("viaje-asignado", { 
                        viajeId: reserva._id.toString(),
                        estado: "asignado",
                        origen: reserva.origen,
                        destino: reserva.destino,
                        proximoDestino: reserva.origen,
                        motorista: { id: motoristaId },
                        mensaje: "Tu motorista ya va hacia ti."
                    });

                    io.to(motoristaRoom).emit("viaje-asignado", {
                        viajeId: reserva._id.toString(),
                        estado: "asignado",
                        activadoDesdeReserva: true,
                        origen: reserva.origen,
                        destino: reserva.destino
                    });

                } else {

                    const mData = await redis.hgetall(`motorista:data:${motoristaId}`);

                    await redis.multi()
                        .srem("motoristas:ocupados", motoristaId)
                        .hset(`motorista:data:${motoristaId}`,
                            "disponible", "true",
                            "viajeActualId", "",
                            "estadoInterno", "libre",
                            "lastUpdate", Date.now().toString()
                        )
                        .del(
                            `lock:motorista:${motoristaId}`, 
                            `lock:cola:${motoristaId}`, 
                            `motorista:snapshot:${motoristaId}`
                        )
                        .exec();

                    if (mData?.lng && mData?.lat) {
                        await redis.hset(`motorista:data:${motoristaId}`, {
                            lat: String(mData.lat),
                            lng: String(mData.lng),
                            lastUpdate: Date.now().toString()
                        });
                        await redis.call("GEOADD", "motoristas:ubicacion", mData.lng, mData.lat, motoristaId);
                    }

                    await actualizarSnapshotMotorista(motoristaId, {
                        viajeActualId: "",
                        estadoInterno: "libre",
                        disponible: true
                    });
                }
            }

            io.to(`motorista:${motoristaId}`).emit("viaje:cancelado", { viajeId, penalidad });
        }

        // 🧹 LIMPIEZA FINAL
        const room = io.sockets.adapter.rooms.get(`viaje:${viajeId}`);
        if (room) {
            room.forEach(sId => {
                const s = io.sockets.sockets.get(sId);
                if (s) s.leave(`viaje:${viajeId}`);
            });
        }

        if (viajesPendientes) {
            viajesPendientes.delete(socket.id);
        }

        socket.emit("viaje:cancelado", {
            viajeId,
            penalidad,
            reembolso
        });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }

        // 🔁 RETRY AUTOMÁTICO
        if (error.message.includes("Write conflict")) {
            console.warn("♻️ Retry cancelarViaje...");
            return cancelarViaje(socket, io, { viajeId });
        }

        console.error("❌ Error en cancelarViaje:", error.message);
        socket.emit("error", { mensaje: "Error al procesar la cancelación" });

    } finally {
        if (lockAdquirido && redis) {
            await redis.del(lockKey);
        }
    }
}

module.exports = cancelarViaje;
