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
  transports: ["polling"], // evita problemas en móviles
});

socket.on("connect", () => {
  console.log(`🟢 Socket conectado: ${socket.id}`);
});

socket.on("connect_error", (err) => {
  console.error("❌ Error socket:", err.message);
});

export default socket;
