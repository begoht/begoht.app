function parseAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS;
  const isProduction = process.env.NODE_ENV === "production";

  if (!raw || !raw.trim()) {
    return isProduction
      ? [
          "https://bego.com.ht",
          "https://www.bego.com.ht",
          "https://localhost",
          "capacitor://localhost",
          "ionic://localhost",
        ]
      : "*";
  }

  if (raw.trim() === "*") {
    if (isProduction && process.env.CORS_ALLOW_ANY_IN_PRODUCTION !== "true") {
      return [
        "https://bego.com.ht",
        "https://www.bego.com.ht",
        "https://localhost",
        "capacitor://localhost",
        "ionic://localhost",
      ];
    }

    return "*";
  }

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
      "X-BeGO-Signature",
      "X-Payment-Signature",
      "X-Moncash-Signature",
      "X-Natcash-Signature",
    ],
  };
}

module.exports = {
  buildCorsOptions,
  parseAllowedOrigins,
};
