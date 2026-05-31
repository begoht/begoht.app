const crypto = require("crypto");
const { redis } = require("../../config/redis");

const LOCK_TTL = 30000;

async function adquirirLock(viajeId) {
    const lockId = crypto.randomUUID();
    const ok = await redis.set(
        `lock:matching:${viajeId}`,
        lockId,
        "NX",
        "PX",
        LOCK_TTL
    );
    return ok ? lockId : null;
}

async function liberarLock(viajeId, lockId) {
    if (!lockId) return;

    const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] 
        then return redis.call("del", KEYS[1]) 
        else return 0 end
    `;

    await redis.eval(script, 1, `lock:matching:${viajeId}`, lockId);
}

module.exports = { adquirirLock, liberarLock };
