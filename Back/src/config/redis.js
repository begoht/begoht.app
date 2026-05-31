// C:\Go\Back\src\config\redis.js
const Redis = require("ioredis");

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  
  maxRetriesPerRequest: null, 
  enableReadyCheck: false,
  lazyConnect: true,
  keepAlive: 10000,

  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
};

// Cliente para comandos normales (GET, SET, HGETALL)
const redis = new Redis(redisConfig);

// Cliente dedicado EXCLUSIVAMENTE a suscripciones (Pub/Sub)
const subClient = new Redis(redisConfig);

redis.on("error", (err) => console.error("❌ Redis Main Error:", err.message));
subClient.on("error", (err) => console.error("❌ Redis Sub Error:", err.message));

redis.on("connect", () => console.log("🚀 Redis conectado (Main)"));
subClient.on("connect", () => console.log("📡 Redis conectado (Sub/Events)"));

module.exports = { redis, subClient,redisConfig };