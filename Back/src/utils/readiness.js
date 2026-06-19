const mongoose = require("mongoose");
const { redis } = require("../config/redis");
const http = require("http");
const https = require("https");
const { verificarConexionEmail } = require("../services/email/email.service");

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

  const [email, routing] = await Promise.all([
    verificarConexionEmail().catch((error) => ({ ok: false, message: error.message })),
    checkRouting(),
  ]);
  const emailRequired = process.env.EMAIL_REQUIRED_FOR_READINESS === "true";
  const routingRequired = process.env.OSRM_REQUIRED_FOR_READINESS === "true";
  const ready =
    mongoReady &&
    redisReady &&
    (!emailRequired || email.ok) &&
    (!routingRequired || routing.ok);

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
      email,
      routing,
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

function checkRouting() {
  const base = String(process.env.OSRM_URL || "").replace(/\/$/, "");
  if (!base) return Promise.resolve({ ok: false, configured: false });

  const url = `${base}/nearest/v1/driving/-72.535,18.234?number=1`;
  const client = url.startsWith("https:") ? https : http;

  return new Promise((resolve) => {
    const req = client.get(url, (response) => {
      response.resume();
      resolve({
        ok: response.statusCode >= 200 && response.statusCode < 300,
        configured: true,
        status: response.statusCode,
      });
    });
    req.setTimeout(Number(process.env.READINESS_OSRM_TIMEOUT_MS || 1500), () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", (error) => resolve({
      ok: false,
      configured: true,
      error: error.message,
    }));
  });
}

module.exports = {
  getReadiness,
};
