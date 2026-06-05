import { validarToken } from "../auth/token.js";
import { getServerUrl } from "../conexion.js";

let socketInstance = null;

export function getSocket() {
  if (socketInstance) return socketInstance;

  const token = validarToken();
  if (!token) {
    console.error("❌ No hay token para socket");
    return null;
  }

  const serverUrl = getServerUrl();

  console.log("🔗 Conectando socket a:", serverUrl);

  socketInstance = io(serverUrl, {
    transports: ["polling", "websocket"],

    // 🔥 SOLO TOKEN
    auth: {
      token,
    },

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 30000,
  });

  /*************************************************
   * 🔌 ESTADOS
   *************************************************/
  socketInstance.on("connect", () => {
    console.log("🟢 Socket conectado:", socketInstance.id);
  });

  socketInstance.on("connect_error", (err) => {
    console.error("🔴 Socket error:", err.message);
    
    const erroresAuth = [
      "Invalid token",
      "Token expired",
      "Token outdated",
      "No token provided",
      "User blocked",
      "User not found"
    ];
    
    if (erroresAuth.includes(err.message)) {
      console.warn("🔐 Token inválido o vencido. Cerrando sesión...");
      cerrarSesion();
    }
  });

  socketInstance.on("disconnect", (reason) => {
    console.warn("🟠 Socket desconectado:", reason);
  });

  window.socket = socketInstance;

  return socketInstance;
}
