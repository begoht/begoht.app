const Viaje = require("../../models/Viaje");
const { redis } = require("../../config/redis");
const { motoristas } = require("../../sockets/viajes/state");
const obtenerMotoristaInfo = require(
    "../../sockets/viajes/motorista/services/motoristaInfo.service"
);
/*************************************************
 * 🔍 SCAN SAFE (NO BLOCK REDIS)
 *************************************************/
async function scanKeys(pattern) {
    let cursor = "0";
    const keys = [];

    do {
        const reply = await redis.scan(
            cursor,
            "MATCH",
            pattern,
            "COUNT",
            100
        );

        cursor = reply[0];

        if (reply[1]?.length) {
            keys.push(...reply[1]);
        }

    } while (cursor !== "0");

    return keys;
}

/*************************************************
 * ✅ ACEPTAR VIAJE
 *************************************************/
async function aceptar(viajeId, motoristaId, socketId, io) {

    const statusKey = `viaje:status:${viajeId}`;
    const ganadorKey = `viaje:ganador:${viajeId}`;

    try {

        /*************************************************
         * 1. CONTEXTO MOTORISTA
         *************************************************/
        let data = await redis.hgetall(
            `motorista:data:${motoristaId}`
        );

        if (!data || Object.keys(data).length === 0) {

            console.warn(
                "⚠️ Redis vacío → motorista:",
                motoristaId
            );

            data = {};
        }

        const enViajeActivo =
            data?.viajeActualId &&
            data.viajeActualId !== "null" &&
            data.viajeActualId !== "";

        const nuevoEstadoDB =
            enViajeActivo
                ? "reservado"
                : "asignado";

        /*************************************************
         * 2. LOCK COLA
         *************************************************/
        if (nuevoEstadoDB === "reservado") {

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

        /*************************************************
         * 3. LUA ANTI-RACE
         *************************************************/
        const luaAceptar = `
            local s = redis.call('get', KEYS[1])
            local g = redis.call('get', KEYS[2])

            if s == 'aceptado' then
                if g == ARGV[1] then
                    return 'OK'
                else
                    return 'YA_TOMADO'
                end
            end

            if s ~= 'ofertando' then
                return 'ESTADO_INVALIDO'
            end

            redis.call(
                'set',
                KEYS[1],
                'aceptado',
                'EX',
                600
            )

            redis.call(
                'set',
                KEYS[2],
                ARGV[1],
                'EX',
                600
            )

            return 'OK'
        `;

        const result = await redis.eval(
            luaAceptar,
            2,
            statusKey,
            ganadorKey,
            motoristaId
        );

        if (result !== "OK") {

            if (nuevoEstadoDB === "reservado") {

                await redis.del(
                    `lock:cola:${motoristaId}`
                );
            }

            return {
                success: false,
                error: result
            };
        }

        /*************************************************
         * 4. CANCELAR OFERTAS GLOBALES
         *************************************************/
        const keys = await scanKeys(
            `viaje:oferta:pendiente:${viajeId}:*`
        );

        if (keys.length) {

            const pipeline = redis.multi();

            for (const key of keys) {

                const motoristaOfertaId =
                    key.split(":").pop();

                /*************************************************
                 * ❌ BORRAR OFERTA
                 *************************************************/
                pipeline.del(key);

                /*************************************************
                 * ❌ LIMPIAR REFERENCIA
                 *************************************************/
                pipeline.hdel(
                    `motorista:data:${motoristaOfertaId}`,
                    "ofertaPendienteKey"
                );

                /*************************************************
                 * 📡 CERRAR POPUP FRONT
                 *************************************************/
                io.to(
                    `motorista:${motoristaOfertaId}`
                ).emit(
                    "viaje:tomado",
                    {
                        viajeId,
                        status: "tomado_por_otro"
                    }
                );
            }

            await pipeline.exec();
        }

        await redis.del(
            `viaje:ofertandos:${viajeId}`
        );

        /*************************************************
         * 5. DB
         *************************************************/
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

            await redis.del(
                statusKey,
                ganadorKey
            );

            return {
                success: false,
                error: "db_error"
            };
        }

        /*************************************************
         * 6. UPDATE MOTORISTA
         *************************************************/
        const updateData = {

            disponible: "false",

            estadoInterno: nuevoEstadoDB,

            lastUpdate: Date.now().toString(),

            viajeReservadoId: ""
        };

        if (nuevoEstadoDB === "asignado") {

            updateData.viajeActualId =
                viajeId.toString();

        } else {

            updateData.viajeReservadoId =
                viajeId.toString();
        }

        await redis.hset(
            `motorista:data:${motoristaId}`,
            updateData
        );

        /*************************************************
         * 🔥 LIMPIAR OFERTA GANADOR
         *************************************************/
        await redis.hdel(
            `motorista:data:${motoristaId}`,
            "ofertaPendienteKey"
        );

        await redis.del(
            `viaje:oferta:pendiente:${viajeId}:${motoristaId}`
        );

        /*************************************************
         * 7. CTX (SOURCE OF TRUTH)
         *************************************************/
        const ctx = {

            estado: nuevoEstadoDB,

            origen: viaje.origen || null,

            destino: viaje.destino || null,

            proximoDestino:
                nuevoEstadoDB === "asignado"
                    ? viaje.origen
                    : null,

            motoristaId
        };

        await redis.set(
            `viaje:ctx:${viajeId}`,
            JSON.stringify(ctx),
            "EX",
            600
        );

        /*************************************************
         * 8. GARANTIZAR POSICIÓN
         *************************************************/
        let lat = parseFloat(data.lat);
        let lng = parseFloat(data.lng);

        if (
            Number.isNaN(lat) ||
            Number.isNaN(lng)
        ) {

            const posRaw = await redis.get(
                `motorista:pos:${motoristaId}`
            );

            if (posRaw) {

                try {

                    const pos = JSON.parse(posRaw);

                    lat = pos.lat;
                    lng = pos.lng;

                } catch (_) {}
            }
        }

        /*************************************************
         * 💾 GUARDAR ÚLTIMA POSICIÓN
         *************************************************/
        if (
            lat != null &&
            lng != null &&
            !Number.isNaN(lat) &&
            !Number.isNaN(lng)
        ) {

            await redis.set(
                `motorista:pos:${motoristaId}`,
                JSON.stringify({ lat, lng }),
                "EX",
                120
            );
        }

        /*************************************************
         * 9. SYNC MEMORIA SOCKET
         *************************************************/
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

        const motoristaInfo =
        await obtenerMotoristaInfo(
            motoristaId,
            null
        );

        await redis.publish(
            `viaje:canal:${viajeId}`,
            JSON.stringify({

                type: "aceptado",

                viajeId,

                motoristaId,

                estado: nuevoEstadoDB,

                origen: viaje.origen,

                destino: viaje.destino,

                motorista: {
                    ...motoristaInfo,
                    lat: lat || 0,
                    lng: lng || 0
                }
                })
        );

        /*************************************************
         * 🔒 LOCK FINAL
         *************************************************/
        await redis.set(
            `viaje:lock:${viajeId}`,
            "accepted",
            "EX",
            30
        );

        return {
            success: true,
            viaje,
            estadoAsignado: nuevoEstadoDB
        };

    } catch (err) {

        console.error(
            "❌ Error en aceptar:",
            err
        );

        /*************************************************
         * ROLLBACK BÁSICO
         *************************************************/
        await redis.del(
            statusKey,
            ganadorKey
        );

        return {
            success: false,
            error: "internal_error"
        };
    }
}

/*************************************************
 * ❌ RECHAZAR
 *************************************************/
async function rechazar(viajeId, motoristaId) {

    await redis.sadd(
        `viaje:saldoBloqueados:${viajeId}`,
        motoristaId
    );

    await redis.expire(
        `viaje:saldoBloqueados:${viajeId}`,
        600
    );

    return {
        success: true
    };
}

module.exports = {
    aceptar,
    rechazar
};