// conexionSocket.js
import { getServerUrl } from "./conexion.js";

let token = localStorage.getItem("token");

// Quitar comillas si existieran
if (token?.startsWith('"') && token.endsWith('"')) {
  token = token.slice(1, -1);
}

// Inicializar socket
const socket = io(getServerUrl(), {
  auth: { token },
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
  console.log(`🟢 Socket conectado: ${socket.id}`);
});

socket.on("connect_error", (err) => {
  console.error("❌ Error socket:", err.message);
});

export default socket;
