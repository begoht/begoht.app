const SOURCE = "driver";
const RELEASE =
  new URL(import.meta.url).searchParams.get("v") ||
  document.querySelector('meta[name="bego-release"]')?.getAttribute("content") ||
  "20260606-monitoring";

const PROD_URL = "https://bego.com.ht";
const DEDUPE_MS = 60_000;
const sentAt = new Map();

function apiBase() {
  try {
    if (typeof window.getServerUrl === "function") return window.getServerUrl();
  } catch {}

  const { hostname, origin, protocol } = window.location;
  const isNative =
    Boolean(window.Capacitor || window.cordova) ||
    protocol === "capacitor:" ||
    protocol === "file:" ||
    origin === "https://localhost";

  if (isNative) return PROD_URL;
  if (hostname === "localhost" || hostname === "127.0.0.1") return PROD_URL;
  return origin || PROD_URL;
}

function clean(value, max = 900) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function connectionInfo() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return null;

  return {
    effectiveType: connection.effectiveType || "",
    type: connection.type || "",
    downlink: Number(connection.downlink || 0),
    rtt: Number(connection.rtt || 0),
    saveData: Boolean(connection.saveData),
  };
}

function storedUserId() {
  const keys = ["userId", "motoristaId", "driverId"];
  try {
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value && /^[a-f0-9]{24}$/i.test(value.replace(/"/g, ""))) return value.replace(/"/g, "");
    }
  } catch {}
  return null;
}

function buildPayload(input = {}) {
  return {
    source: SOURCE,
    level: input.level || "error",
    type: clean(input.type || "frontend_error", 80),
    message: clean(input.message || "Frontend error", 700),
    stack: clean(input.stack || "", 4000),
    url: clean(input.url || window.location.href, 900),
    route: clean(window.location.pathname + window.location.search, 180),
    release: RELEASE,
    userAgent: clean(navigator.userAgent, 700),
    platform: clean(navigator.platform, 80),
    online: navigator.onLine !== false,
    viewport: {
      width: window.innerWidth || 0,
      height: window.innerHeight || 0,
      dpr: window.devicePixelRatio || 1,
    },
    connection: connectionInfo(),
    app: {
      source: SOURCE,
      visibility: document.visibilityState,
      language: navigator.language || "",
    },
    userId: storedUserId(),
  };
}

function fingerprint(payload) {
  return [payload.source, payload.level, payload.type, payload.message, payload.stack.slice(0, 180), payload.route].join("|");
}

function shouldSend(payload) {
  const key = fingerprint(payload);
  const now = Date.now();
  const last = sentAt.get(key) || 0;
  if (now - last < DEDUPE_MS) return false;
  sentAt.set(key, now);
  return true;
}

function postPayload(payload) {
  const body = JSON.stringify(payload);
  const endpoint = `${apiBase().replace(/\/$/, "")}/api/monitor/frontend-error`;

  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(endpoint, blob)) return;
    } catch {}
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

function report(input = {}) {
  const payload = buildPayload(input);
  if (!shouldSend(payload)) return;
  postPayload(payload);
}

function normalizeError(error) {
  if (!error) return { message: "Unknown error", stack: "" };
  if (error instanceof Error) return { message: error.message, stack: error.stack || "" };
  if (typeof error === "object") {
    return {
      message: error.message || error.reason || JSON.stringify(error).slice(0, 700),
      stack: error.stack || "",
    };
  }
  return { message: String(error), stack: "" };
}

window.addEventListener(
  "error",
  (event) => {
    if (event.target && event.target !== window) {
      const target = event.target;
      report({
        level: "warning",
        type: "resource_error",
        message: `No cargo recurso: ${target.src || target.href || target.currentSrc || target.tagName || "unknown"}`,
      });
      return;
    }

    report({
      level: "error",
      type: "javascript_error",
      message: event.message,
      stack: event.error?.stack || "",
      url: event.filename || window.location.href,
    });
  },
  true
);

window.addEventListener("unhandledrejection", (event) => {
  const error = normalizeError(event.reason);
  report({
    level: "error",
    type: "unhandled_rejection",
    message: error.message,
    stack: error.stack,
  });
});

window.begoReportFrontendError = report;

window.begoMonitorSocket = function begoMonitorSocket(socket, meta = {}) {
  if (!socket || socket.__begoMonitoringAttached) return socket;
  socket.__begoMonitoringAttached = true;

  socket.on?.("connect_error", (error) => {
    report({
      level: "error",
      type: "socket_connect_error",
      message: error?.message || "Socket connect error",
      stack: error?.stack || "",
      url: window.location.href,
      channel: meta.channel || "",
    });
  });

  socket.on?.("disconnect", (reason) => {
    const noisyReasons = new Set(["transport close", "ping timeout", "transport error"]);
    report({
      level: noisyReasons.has(reason) ? "warning" : "info",
      type: "socket_disconnect",
      message: `${meta.channel || "socket"} desconectado: ${reason || "unknown"}`,
      url: window.location.href,
    });
  });

  return socket;
};
