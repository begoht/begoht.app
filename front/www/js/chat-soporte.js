import socket from "./conexionSocket.js";

/*************************************************
 * ELEMENTOS DOM
 *************************************************/
const chatBody = document.getElementById("chatBody");
const input = document.getElementById("mensajeInput");
const enviarBtn = document.getElementById("enviarBtn");

/*************************************************
 * SOCKET
 *************************************************/
socket.on("connect", () => {
  console.log("🟢 Usuario conectado a soporte");
  socket.emit("soporte:join");
});

/*************************************************
 * ENVIAR
 *************************************************/
function enviarMensaje() {
  const mensaje = input.value.trim();
  if (!mensaje) return;

  socket.emit("soporte:mensaje", { mensaje });
  input.value = "";
}

enviarBtn.addEventListener("click", enviarMensaje);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") enviarMensaje();
});

/*************************************************
 * RECIBIR
 *************************************************/
socket.on("soporte:mensaje", (data) => {
  const div = document.createElement("div");
  div.className = `mensaje ${data.from}`;
  div.textContent = data.mensaje;

  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
});

/*************************************************
 * ERRORES
 *************************************************/
socket.on("connect_error", (err) => {
  console.error("❌ Socket error:", err.message);
});
