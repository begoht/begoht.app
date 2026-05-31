const { redis } = require("../../../../config/redis");
const { matchingQueue } = require("../../../../config/queues");

/**
 * 🧹 Limpia TODOS los residuos de matching/cache/jobs
 * de un viaje finalizado/cancelado.
 *
 * Se usa en:
 * - viaje finalizado
 * - cancelación pasajero
 * - cancelación motorista
 * - timeout
 * - error crítico
 */
async function limpiarMatching(viajeId) {
    try {
        if (!viajeId) return;

        console.log(`🧹 Limpiando matching del viaje ${viajeId}`);

        /*************************************************
         * 🧠 1. OBTENER MOTORISTAS AFECTADOS
         *************************************************/
        const [
            ofertados,
            excluidos,
            rechazados
        ] = await Promise.all([
            redis.smembers(`viaje:ofertandos:${viajeId}`),
            redis.smembers(`viaje:excluidos:${viajeId}`),
            redis.smembers(`viaje:rechazados:${viajeId}`)
        ]);

        const motoristasAfectados = new Set([
            ...(ofertados || []),
            ...(excluidos || []),
            ...(rechazados || [])
        ]);

        if (global.io && motoristasAfectados.size > 0) {
            for (const motoristaId of motoristasAfectados) {
                global.io.to(`motorista:${motoristaId}`).emit("viaje:cancelado", {
                    viajeId,
                    motivo: "busqueda_anulada"
                });
            }
        }

        /*************************************************
         * 🧹 2. LIMPIAR ESTADO MOTORISTAS
         *************************************************/
        if (motoristasAfectados.size > 0) {

            const pipe = redis.pipeline();

            for (const motoristaId of motoristasAfectados) {

                /*****************************************
                 * 🔓 Locks / Ofertas
                 *****************************************/
                pipe.hdel(
                    `motorista:data:${motoristaId}`,
                    "ofertaPendienteKey",
                    "viajeActual",
                    "estadoViaje"
                );

                pipe.del(`lock:cola:${motoristaId}`);
                pipe.del(`motorista:${motoristaId}:reservado`);

                /*****************************************
                 * 🧹 Flags colgadas
                 *****************************************/
                pipe.del(`motorista:viaje:${motoristaId}`);
                pipe.del(`motorista:tracking:${motoristaId}`);
            }

            await pipe.exec();

            console.log(
                `🧹 ${motoristasAfectados.size} motoristas limpiados`
            );
        }

        /*************************************************
         * 🧹 3. BORRAR KEYS PRINCIPALES DEL VIAJE
         *************************************************/
        const keysViaje = [

            /************* CORE *************/
            `viaje:status:${viajeId}`,
            `viaje:data:${viajeId}`,
            `viaje:ganador:${viajeId}`,
            `viaje:cancelado:${viajeId}`,
            `viaje:finalizado:${viajeId}`,
            `viaje:activo:${viajeId}`,

            /************* DISPATCH *************/
            `despacho:${viajeId}`,
            `viaje:lock:dispatch:${viajeId}`,
            `viaje:dispatching:${viajeId}`,

            /************* MATCHING *************/
            `viaje:ofertando:${viajeId}`,
            `viaje:ofertandos:${viajeId}`,
            `viaje:rechazados:${viajeId}`,
            `viaje:excluidos:${viajeId}`,
            `viaje:saldoBloqueados:${viajeId}`,

            /************* TRACKING *************/
            `track:${viajeId}`,
            `tracking:${viajeId}`,
            `viaje:tracking:${viajeId}`,

            /************* SOCKETS *************/
            `viaje:sala:${viajeId}`,

            /************* CACHE *************/
            `viaje:cache:${viajeId}`,
            `viaje:snapshot:${viajeId}`
        ];

        await redis.del(...keysViaje);

        /*************************************************
         * 🧹 4. LIMPIAR OFERTAS PENDIENTES
         *************************************************/
        const ofertaStream = redis.scanStream({
            match: `viaje:oferta:pendiente:${viajeId}:*`,
            count: 100
        });

        const ofertaKeys = [];

        for await (const keys of ofertaStream) {
            ofertaKeys.push(...keys);
        }

        if (ofertaKeys.length > 0) {
            await redis.del(...ofertaKeys);

            console.log(
                `🧹 ${ofertaKeys.length} ofertas pendientes eliminadas`
            );
        }

        /*************************************************
         * 🧹 5. LIMPIAR TRACKING RESIDUAL
         *************************************************/
        const trackingStream = redis.scanStream({
            match: `track:${viajeId}:*`,
            count: 100
        });

        const trackingKeys = [];

        for await (const keys of trackingStream) {
            trackingKeys.push(...keys);
        }

        if (trackingKeys.length > 0) {
            await redis.del(...trackingKeys);

            console.log(
                `🧹 ${trackingKeys.length} tracking keys eliminadas`
            );
        }

        /*************************************************
         * 🧹 6. ELIMINAR JOBS BULLMQ
         *************************************************/
        const jobsParaEliminar = [
            `buscar-${viajeId}`,
            `buscar-motorista-${viajeId}`,
            `despacho-${viajeId}`,
            `expirar-${viajeId}`,
            `tracking-${viajeId}`,
            `cleanup-${viajeId}`,
            viajeId
        ];

        for (const jobId of jobsParaEliminar) {

            try {

                const job = await matchingQueue.getJob(jobId);

                if (!job) continue;

                const state = await job.getState();

                /*****************************************
                 * ⚠️ NO remover si está activo
                 *****************************************/
                if (state === "active") {
                    console.warn(
                        `⚠️ Job ${jobId} activo (skip)`
                    );
                    continue;
                }

                await job.remove();

                console.log(`🗑 Job ${jobId} eliminado`);

            } catch (err) {

                if (
                    err?.message?.includes("locked")
                ) {
                    console.warn(
                        `⚠️ Job ${jobId} bloqueado (OK)`
                    );
                } else {
                    console.error(
                        `❌ Error eliminando job ${jobId}:`,
                        err.message
                    );
                }
            }
        }

        /*************************************************
         * 🧹 7. LIMPIAR ROOM SOCKET.IO
         *************************************************/
        try {

            if (global.io) {

                const room = `track:${viajeId}`;

                const sockets =
                    await global.io.in(room).fetchSockets();

                for (const socket of sockets) {
                    socket.leave(room);
                }

                console.log(
                    `🧹 Sala Socket.IO limpiada: ${room}`
                );
            }

        } catch (err) {

            console.error(
                "❌ Error limpiando room socket:",
                err.message
            );
        }

        /*************************************************
         * 🧹 8. CLEANUP EXTRA UI/ESTADOS
         *************************************************/
        await redis.del(
            `pasajero:viaje:${viajeId}`,
            `pasajero:estado:${viajeId}`,
            `pasajero:tracking:${viajeId}`
        );

        /*************************************************
         * ✅ FIN
         *************************************************/
        console.log(
            `✅ Matching COMPLETAMENTE limpio para viaje ${viajeId}`
        );

    } catch (err) {

        console.error(
            "❌ Error crítico limpiando matching:",
            err
        );
    }
}

module.exports = limpiarMatching;
