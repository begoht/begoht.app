const mongoose = require("mongoose");
const { redis } = require("../config/redis");

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

async function getReadiness() {
  const mongoReady = mongoose.connection.readyState === 1;
  let redisReady = false;
  let redisError = null;

  try {
    const pong = await withTimeout(
      redis.ping(),
      Number(process.env.READINESS_REDIS_TIMEOUT_MS || 800)
    );
    redisReady = pong === "PONG";
  } catch (err) {
    redisError = err.message;
  }

  const ready = mongoReady && redisReady;

  return {
    ready,
    service: "bego",
    checks: {
      mongo: {
        ok: mongoReady,
        state: mongoose.connection.readyState,
      },
      redis: {
        ok: redisReady,
        error: redisError,
      },
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getReadiness,
};
