const Viaje = require("../models/Viaje");
const { redis } = require("../config/redis");
const { calcularDistanciaMetros } = require("../utils/geo");
const crypto = require("crypto");
const mongoose = require("mongoose");

const RADIO_CERCANIA_DESTINO = 800;

module.exports = async function reservaInteligente({ io, motoristaId, nuevoViaje }) {

    const lockId = crypto.randomUUID();
    const lockKey = `lock:reserva:${nuevoViaje._id}`;

    const locked = await redis.set(lockKey, lockId, "NX", "PX", 5000);
    if (!locked) return null;

    try {

        const [mData, ocupado] = await Promise.all([
            redis.hgetall(`motorista:data:${motoristaId}`),
            redis.sismember("motoristas:ocupados", motoristaId)
        ]);

        const lat = parseFloat(mData.lat);
        const lng = parseFloat(mData.lng);

        if (
            Number.isNaN(lat) ||
            Number.isNaN(lng) ||
            !ocupado ||
            mData.viajeActualId === nuevoViaje._id.toString()
        ) return null;

        const mObjectId = new mongoose.Types.ObjectId(motoristaId);

        const yaTieneReserva = await Viaje.exists({
            motorista: mObjectId,
            estado: "reservado"
        });

        if (yaTieneReserva) return null;

        const viajeActivo = await Viaje.findOne({
            motorista: mObjectId,
            estado: { $in: ["asignado","en_curso","llego"] }
        }).select("destino").lean();

        if (!viajeActivo?.destino) return null;

        const distDestino = calcularDistanciaMetros(
            lat,
            lng,
            viajeActivo.destino.lat,
            viajeActivo.destino.lng
        );

        if (distDestino > RADIO_CERCANIA_DESTINO) return null;

        const reservado = await Viaje.findOneAndUpdate(
            { _id: nuevoViaje._id, estado: "buscando", motorista: null },
            {
                $set: {
                    estado: "reservado",
                    motorista: mObjectId,
                    reservadoEn: new Date()
                }
            },
            { new: true }
        );

        if (reservado && mData.socketId) {

            const emitKey = `emit:reserva:${nuevoViaje._id}:${motoristaId}`;
            const emitLock = await redis.set(emitKey, 1, "NX", "EX", 10);

            if (emitLock) {

                const payload = reservado.toObject
                    ? reservado.toObject()
                    : reservado;

                io.to(mData.socketId).emit("viaje:oferta", {
                    ...payload,
                    viajeId: reservado._id,
                    esReserva: true
                });
            }
        }

        return reservado;

    } catch (error) {
        console.error("❌ Error en reservaInteligente:", error);
        return null;
    } finally {
        const script = `
        if redis.call("get", KEYS[1]) == ARGV[1]
        then return redis.call("del", KEYS[1])
        else return 0
        end`;
        await redis.eval(script, 1, lockKey, lockId);
    }
};
