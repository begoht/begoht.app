const fs = require("fs");
const path = require("path");

const Viaje = require("../../../../models/Viaje");

const { redis } = require("../../../../config/redis");

const cancelarOfertasPendientes = require("./viajeOferta.service");
const actualizarContextoViaje = require("./viajeContext.service");
const publicarViaje = require("./viajePubSub.service");
const snapshotMotorista = require("./motoristaSnapshot.service");
const { obtenerProximoDestinoReserva } = require("./reservaRoute.service");
const {
    evaluarElegibilidadReserva
} = require("../../../../services/matching_services/reservaEligibility.service");
const {
    getOfferKey,
    getOfferLockKey,
    releaseOfferLock
} = require("../../../../services/matching_services/offerLock.service");

const { motoristas } = require("../../state");

const luaAceptar = fs.readFileSync(
    path.join(__dirname, "../lua/aceptarViaje.lua"),
    "utf8"
);

module.exports = async ({
    viajeId,
    motoristaId,
    socketId,
    io
}) => {
    const statusKey = `viaje:status:${viajeId}`;
    const ganadorKey = `viaje:ganador:${viajeId}`;
    const ofertaKey = getOfferKey(viajeId, motoristaId);
    const ofertaLockKey = getOfferLockKey(motoristaId);

    try {
        let data = await redis.hgetall(`motorista:data:${motoristaId}`);

        if (!data || Object.keys(data).length === 0) {
            data = {};
        }

        const enViajeActivo =
            data?.viajeActualId &&
            data.viajeActualId !== "null" &&
            data.viajeActualId !== "";
        const viajeActualId = enViajeActivo ? data.viajeActualId : null;

        const nuevoEstadoDB = enViajeActivo
            ? "reservado"
            : "asignado";

        if (nuevoEstadoDB === "reservado") {
            const tieneReserva = await redis.exists(`lock:cola:${motoristaId}`);
            const reservaElegible = await evaluarElegibilidadReserva({
                motoristaId,
                data,
                tieneReserva: !!tieneReserva
            });

            if (!reservaElegible.permitir) {
                return {
                    success: false,
                    error: "reserva_no_disponible"
                };
            }

            const locked = await redis.set(
                `lock:cola:${motoristaId}`,
                viajeId,
                "NX",
                "EX",
                600
            );

            if (!locked) {
                return {
                    success: false,
                    error: "cola_llena"
                };
            }
        }

        const result = await redis.eval(
            luaAceptar,
            4,
            statusKey,
            ganadorKey,
            ofertaKey,
            ofertaLockKey,
            motoristaId,
            String(viajeId)
        );

        if (result !== "OK") {
            if (nuevoEstadoDB === "reservado") {
                await redis.del(`lock:cola:${motoristaId}`);
            }

            await releaseOfferLock({ viajeId, motoristaId });

            return {
                success: false,
                error: result
            };
        }

        await cancelarOfertasPendientes(viajeId, motoristaId);

        const updateFields = {
            estado: nuevoEstadoDB,
            motorista: motoristaId,
            motoristaSocket: socketId,
            [
                nuevoEstadoDB === "reservado"
                    ? "reservadoEn"
                    : "aceptadoEn"
            ]: new Date()
        };

        if (nuevoEstadoDB === "asignado") {
            updateFields.asignadoEn = updateFields.aceptadoEn;
            updateFields.horaAsignado = updateFields.aceptadoEn;
        }

        const viaje = await Viaje.findOneAndUpdate(
            {
                _id: viajeId,
                estado: "ofertando"
            },
            {
                $set: updateFields
            },
            {
                new: true
            }
        );

        if (!viaje) {
            await redis.del(statusKey, ganadorKey);
            await releaseOfferLock({ viajeId, motoristaId });

            if (nuevoEstadoDB === "reservado") {
                await redis.del(`lock:cola:${motoristaId}`);
            }

            return {
                success: false,
                error: "db_error"
            };
        }

        const updateData = {
            disponible: "false",
            estadoInterno:
                nuevoEstadoDB === "asignado"
                    ? "viajando"
                    : nuevoEstadoDB,
            lastUpdate: Date.now().toString(),
            viajeReservadoId: "",
            tieneReserva:
                nuevoEstadoDB === "reservado"
                    ? "true"
                    : "false"
        };

        if (nuevoEstadoDB === "asignado") {
            updateData.viajeActualId = viajeId.toString();
        } else {
            updateData.viajeReservadoId = viajeId.toString();
        }

        await redis.hset(
            `motorista:data:${motoristaId}`,
            updateData
        );

        await redis.hdel(
            `motorista:data:${motoristaId}`,
            "ofertaPendienteKey"
        );

        await redis.del(ofertaKey);
        await releaseOfferLock({ viajeId, motoristaId });

        const proximoDestinoReserva =
            nuevoEstadoDB === "reservado"
                ? await obtenerProximoDestinoReserva(motoristaId, viajeActualId)
                : null;

        const ctx = {
            estado: nuevoEstadoDB,
            origen: viaje.origen || null,
            destino: viaje.destino || null,
            proximoDestino:
                nuevoEstadoDB === "asignado"
                    ? viaje.origen
                    : proximoDestinoReserva,
            motoristaId
        };

        await actualizarContextoViaje(viajeId, ctx);

        const snapshot = await snapshotMotorista(motoristaId);

        if (motoristas) {
            const m = motoristas.get(socketId);

            if (m) {
                m.viajeActualId =
                    nuevoEstadoDB === "asignado"
                        ? viajeId.toString()
                        : null;

                m.viajeReservadoId =
                    nuevoEstadoDB === "reservado"
                        ? viajeId.toString()
                        : null;

                m.ctx = ctx;
            }
        }

        await publicarViaje(viajeId, {
            type: "aceptado",
            motoristaId,
            estado: nuevoEstadoDB
        });

        await redis.set(
            `viaje:lock:${viajeId}`,
            "accepted",
            "EX",
            30
        );

        return {
            success: true,
            viaje,
            estadoAsignado: nuevoEstadoDB,
            proximoDestino: proximoDestinoReserva
        };
    } catch (err) {
        console.error("❌ aceptar service:", err);

        await redis.del(statusKey, ganadorKey);
        await releaseOfferLock({ viajeId, motoristaId });

        return {
            success: false,
            error: "internal_error"
        };
    }
};
