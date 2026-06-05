const rateLimit = require("express-rate-limit");

const standard = {
  standardHeaders: true,
  legacyHeaders: false,
};

const authLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  message: { msg: "Demasiados intentos. Intenta mas tarde." },
});

const registerLimiter = rateLimit({
  ...standard,
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.REGISTER_RATE_LIMIT_MAX || 10),
  message: { msg: "Demasiados registros desde esta conexion. Intenta mas tarde." },
});

const refreshLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.REFRESH_RATE_LIMIT_MAX || 120),
  message: { msg: "Demasiadas renovaciones de sesion. Intenta mas tarde." },
});

module.exports = {
  authLimiter,
  registerLimiter,
  refreshLimiter,
};
