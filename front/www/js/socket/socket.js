import { validarToken } from "../auth/token.js";
import {
  clearSessionTokens,
  refreshAccessToken,
} from "../auth/session.js";
import { getServerUrl } from "../conexion.js";

let socketInstance = null;
let refreshInFlight = false;

function isAuthError(message = "") {
  return [
    "Invalid token",
    "Token expired",
    "Token outdated",
    "No token provided",
    "User blocked",
    "User not found",
    "Socket authentication failed",
  ].some((item) => String(message || "").includes(item));
}

async function refreshSocketAuth() {
  if (!socketInstance || refreshInFlight) return;
  refreshInFlight = true;

  try {
    const token = await refreshAccessToken();
    socketInstance.auth = {
      ...(socketInstance.auth || {}),
      token,
    };

    if (!socketInstance.connected) {
      socketInstance.connect();
    }
  } catch (err) {
    console.warn("No se pudo renovar la sesion:", err?.message || err);
    clearSessionTokens();
    window.location.replace("registro.html");
  } finally {
    refreshInFlight = false;
  }
}

export function getSocket() {
  if (socketInstance) return socketInstance;

  const token = validarToken();
  if (!token) {
    console.error("No hay token para socket");
    return null;
  }

  const serverUrl = getServerUrl();
  console.log("Conectando socket a:", serverUrl);

  socketInstance = io(serverUrl, {
    transports: ["websocket"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 30000,
  });

  window.begoMonitorSocket?.(socketInstance, { source: "passenger", channel: "main" });

  socketInstance.on("connect", () => {
    console.log("Socket conectado:", socketInstance.id);
  });

  socketInstance.on("connect_error", (err) => {
    console.error("Socket error:", err?.message || err);
    if (isAuthError(err?.message)) {
      refreshSocketAuth();
    }
  });

  socketInstance.on("disconnect", (reason) => {
    console.warn("Socket desconectado:", reason);
    if (reason === "io server disconnect") {
      refreshSocketAuth();
    }
  });

  window.socket = socketInstance;
  return socketInstance;
}
