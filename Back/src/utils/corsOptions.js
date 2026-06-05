function parseAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS || "*";
  if (raw.trim() === "*") return "*";

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildCorsOptions() {
  const allowed = parseAllowedOrigins();

  return {
    origin(origin, callback) {
      if (allowed === "*") return callback(null, true);
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "ngrok-skip-browser-warning",
    ],
  };
}

module.exports = {
  buildCorsOptions,
  parseAllowedOrigins,
};
