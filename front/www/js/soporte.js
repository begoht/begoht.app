import socket from "./conexionSocket.js";

const chatBody = document.getElementById("chatBody");
const input = document.getElementById("mensajeInput");
const enviarBtn = document.getElementById("enviarBtn");

/*********************************
 * CONECTAR A SOPORTE
 *********************************/
socket.on("connect", () => {
  console.log("🟢 Conectado a soporte");
  socket.emit("soporte:join");
});

/*********************************
 * ENVIAR MENSAJE
 *********************************/
enviarBtn.addEventListener("click", enviar);
input.addEventListener("keypress", e => {
  if (e.key === "Enter") enviar();
});

function enviar() {
  const texto = input.value.trim();
  if (!texto) return;

  socket.emit("soporte:mensaje", {
    mensaje: texto
  });

  agregarMensaje(texto, "usuario");
  input.value = "";
}

/*********************************
 * RECIBIR MENSAJES
 *********************************/
socket.on("soporte:mensaje", data => {
  const { mensaje, from, nombre } = data;

  if (from === "usuario") return; // evitar duplicado

  agregarMensaje(mensaje, "soporte", nombre);
});

/*********************************
 * UI
 *********************************/
function agregarMensaje(texto, tipo, nombre = "") {
  const div = document.createElement("div");
  div.className = "mensaje " + tipo;

  if (tipo === "soporte") {
    div.innerHTML = `<strong>${nombre}:</strong> ${texto}`;
  } else {
    div.textContent = texto;
  }

  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}
