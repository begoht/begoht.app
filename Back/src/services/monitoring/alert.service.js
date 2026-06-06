const crypto = require("crypto");
const { redis } = require("../../config/redis");
const { logCritical } = require("./criticalLogger");
const { enviarAlertaMonitoreo } = require("../email/email.service");

function alertRecipient() {
  return String(
    process.env.MONITOR_ALERT_EMAIL ||
    process.env.MONITOR_ALERT_TO ||
    process.env.EMAIL_TEST_TO ||
    process.env.EMAIL_USER ||
    ""
  ).trim();
}

function fingerprint(value = "") {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 16);
}

function redisTimeoutMs() {
  return Number(process.env.MONITOR_REDIS_TIMEOUT_MS || 1500);
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMeta(meta = {}) {
  return Object.entries(meta)
    .slice(0, 16)
    .map(([key, value]) => `
      <tr>
        <td style="padding:8px 10px;color:#64748b;font-size:12px;font-weight:800;">${escapeHtml(key)}</td>
        <td style="padding:8px 10px;color:#0f172a;font-size:12px;word-break:break-word;">${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td>
      </tr>
    `)
    .join("");
}

async function shouldSend(dedupeKey, ttlSeconds) {
  if (!dedupeKey) return true;

  try {
    const ok = await withTimeout(
      redis.set(`monitor:alert:${dedupeKey}`, "1", "NX", "EX", ttlSeconds),
      redisTimeoutMs(),
      "monitor alert dedupe"
    );
    return ok === "OK";
  } catch {
    return true;
  }
}

async function sendMonitoringAlert({
  type,
  severity = "warning",
  title,
  message,
  meta = {},
  dedupeKey,
  dedupeSeconds = Number(process.env.MONITOR_ALERT_DEDUP_SECONDS || 900),
} = {}) {
  const alertType = type || "monitor_alert";
  const alertTitle = title || `BeGO monitor: ${alertType}`;
  const alertMessage = message || "";
  const key = dedupeKey || `${alertType}:${fingerprint(alertMessage + JSON.stringify(meta))}`;

  const payload = await logCritical({
    type: alertType,
    severity,
    message: alertMessage,
    meta,
  });

  if (!(await shouldSend(key, dedupeSeconds))) {
    return { sent: false, deduped: true, payload };
  }

  const to = alertRecipient();
  if (!to) {
    console.warn("Monitor BeGO sin MONITOR_ALERT_EMAIL configurado.");
    return { sent: false, missingRecipient: true, payload };
  }

  try {
    await enviarAlertaMonitoreo({
      to,
      subject: `[BeGO ${severity.toUpperCase()}] ${alertTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
          <div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <div style="background:#07111f;color:#fff;padding:22px;">
              <div style="color:#93c5fd;font-size:11px;font-weight:900;text-transform:uppercase;">BeGO Monitoring</div>
              <h1 style="margin:6px 0 0;font-size:22px;">${escapeHtml(alertTitle)}</h1>
              <p style="margin:8px 0 0;color:#cbd5e1;line-height:1.5;">${escapeHtml(alertMessage)}</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${renderMeta({ severity, type: alertType, ...meta, timestamp: payload.ts })}
            </table>
          </div>
        </div>
      `,
      idempotencyKey: `monitor-${key}-${Math.floor(Date.now() / (dedupeSeconds * 1000))}`,
    });

    return { sent: true, payload };
  } catch (error) {
    await logCritical({
      type: "monitor_alert_email_failed",
      severity: "error",
      message: error.message,
      meta: { alertType },
    });
    return { sent: false, error: error.message, payload };
  }
}

module.exports = {
  sendMonitoringAlert,
};
