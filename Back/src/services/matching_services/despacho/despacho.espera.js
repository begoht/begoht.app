const { redis } = require("../../../config/redis");

async function esperarRespuestaRedis(viajeId, timeoutMs) {
    const sub = redis.duplicate();
    let resuelto = false;

    const canal = `viaje:canal:${viajeId}`;
    const ganadorKey = `viaje:ganador:${viajeId}`;
    const lockKey = `viaje:lock:${viajeId}`;

    try {
        await sub.connect();

        return await new Promise(async (resolve) => {
            let timer;
            let interval;

            const cleanup = async (resultado) => {
                if (resuelto) return;
                resuelto = true;

                try {
                    if (timer) clearTimeout(timer);
                    if (interval) clearInterval(interval);
                    try { await sub.unsubscribe(canal); } catch {}
                    try { await sub.quit(); } catch {}
                } catch {}

                resolve(resultado);
            };

            const checkGanador = async (label = "") => {
                try {
                    const ganador = await redis.get(ganadorKey);
                    if (ganador) {
                        console.log(`🟢 [${label}] ganador detectado`);
                        await redis.set(lockKey, "accepted", "EX", 30);
                        return cleanup("aceptado");
                    }
                } catch {}
            };

            // Fast track inicial
            await checkGanador("FAST-TRACK");
            if (resuelto) return;

            try {
                await sub.subscribe(canal, async (msg) => {
                    if (resuelto) return;

                    try {
                        const data = typeof msg === "string" ? JSON.parse(msg) : msg;

                        /*************************************************
                         * 🛡️ PARSER POLIMÓRFICO COMPLETO
                         *************************************************/
                        if (
                            data?.type === "aceptado" || 
                            data?.estado === "aceptado" || 
                            data?.estado === "asignado" ||
                            msg === "aceptado"
                        ) {
                            console.log("✅ [PUBSUB] viaje tomado de forma segura");
                            return cleanup("aceptado");
                        }

                        if (
                            data?.type === "rechazado" ||
                            data?.estado === "rechazado"
                        ) {
                            return cleanup("rechazado");
                        }
                    } catch (e) {
                        // Resguardo para strings crudos antiguos
                        if (msg === "aceptado") {
                            return cleanup("aceptado");
                        }
                    }

                    await checkGanador("PUBSUB-FALLBACK");
                });
            } catch (err) {
                console.warn("⚠️ Error subscribe, usando polling fuerte");
            }

            await checkGanador("POST-SUBSCRIBE");
            if (resuelto) return;

            interval = setInterval(() => {
                if (resuelto) return;
                checkGanador("POLLING");
            }, 150);

            timer = setTimeout(async () => {
                if (resuelto) return;
                try {
                    for (let i = 0; i < 3; i++) {
                        const ganador = await redis.get(ganadorKey);
                        if (ganador) {
                            console.log("🟢 [TIMEOUT-FIX] ganador detectado");
                            return cleanup("aceptado");
                        }
                        await new Promise(r => setTimeout(r, 80));
                    }

                    const lock = await redis.get(lockKey);
                    if (lock === "accepted") {
                        console.log("🟢 [LOCK-FALLBACK] aceptado");
                        return cleanup("aceptado");
                    }
                } catch (e) {
                    console.error("❌ timeout check:", e);
                }

                console.log("⏱️ timeout real");
                return cleanup("timeout");
            }, timeoutMs);
        });

    } catch (err) {
        console.error("❌ esperarRespuestaRedis crítico:", err);
        // 🔥 SAFEGUARD: Evita fugas si falla antes del Promise
        try { await sub.quit(); } catch {} 
        return "timeout";
    }
}

module.exports = { esperarRespuestaRedis };
