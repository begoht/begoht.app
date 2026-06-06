import { getServerUrl } from "./conexion.js";
import {
  clearSessionTokens,
  getStoredAccessToken,
  refreshAccessToken,
} from "./auth/session.js";

let refreshInFlight = false;

function isAuthError(message = "") {
  return String(message || "").includes("token") ||
    String(message || "").includes("Token") ||
    String(message || "").includes("authentication");
}

async function refreshSocketAuth(socket) {
  if (!socket || refreshInFlight) return;
  refreshInFlight = true;

  try {
    const token = await refreshAccessToken();
    socket.auth = { ...(socket.auth || {}), token };
    if (!socket.connected) socket.connect();
  } catch (err) {
    console.warn("No se pudo renovar la sesion:", err?.message || err);
    clearSessionTokens();
    window.location.replace("registro.html");
  } finally {
    refreshInFlight = false;
  }
}

const socket = io(getServerUrl(), {
  auth: { token: getStoredAccessToken() },
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 30000,
});

window.begoMonitorSocket?.(socket, { source: "passenger", channel: "support" });

socket.on("connect", () => {
  console.log(`Socket conectado: ${socket.id}`);
});

socket.on("connect_error", (err) => {
  console.error("Error socket:", err?.message || err);
  if (isAuthError(err?.message)) refreshSocketAuth(socket);
});

socket.on("disconnect", (reason) => {
  if (reason === "io server disconnect") refreshSocketAuth(socket);
});

export default socket;
