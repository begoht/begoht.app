const fs = require("fs");
const path = require("path");

function defaultLogPath() {
  return process.env.CRITICAL_LOG_PATH || "/var/log/bego/critical.log";
}

function fallbackLogPath() {
  return path.resolve(__dirname, "../../../logs/critical.log");
}

function sanitize(value, max = 2000) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, max);
}

async function appendJsonLine(targetPath, payload) {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.promises.appendFile(targetPath, `${JSON.stringify(payload)}\n`, "utf8");
}

async function logCritical(event = {}) {
  const payload = {
    ts: new Date().toISOString(),
    service: "bego",
    severity: sanitize(event.severity || "critical", 40),
    type: sanitize(event.type || "unknown", 100),
    message: sanitize(event.message || "", 1000),
    meta: event.meta || {},
  };

  const line = `[${payload.severity.toUpperCase()}] ${payload.type}: ${payload.message}`;
  if (payload.severity === "critical" || payload.severity === "error") {
    console.error(line);
  } else {
    console.warn(line);
  }

  try {
    await appendJsonLine(defaultLogPath(), payload);
  } catch {
    await appendJsonLine(fallbackLogPath(), payload);
  }

  return payload;
}

module.exports = {
  logCritical,
};
