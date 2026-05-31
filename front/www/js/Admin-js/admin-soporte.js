/*************************************************
 * ⚡ ADMIN SOPORTE PROFESIONAL
 *************************************************/

// 🔐 TOKEN
let token = localStorage.getItem("token");
if (!token) window.location.replace("/login.html");
if (token.startsWith('"') && token.endsWith('"')) {
  token = token.slice(1, -1);
}

// 🔌 SOCKET
const API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:3000"
  : window.location.origin;

const socket = io(API_BASE, {
  auth: { token },
  transports: ["websocket", "polling"],
});

// 🧩 DOM
const listaUsuarios = document.getElementById("listaUsuarios");
const chatBody = document.getElementById("chatBody");
const mensajeInput = document.getElementById("mensaje");
const userIdInput = document.getElementById("userIdSeleccionado");
const searchInput = document.getElementById("searchUsuarios");
const totalConectados = document.getElementById("totalConectados");
const totalMensajes = document.getElementById("totalMensajes");

// 📊 ESTADO
let usuarios = new Map();
let mensajesTotales = 0;
let alertasEnviadas = 0;

/*************************************************
 * 🔗 CONEXIÓN
 *************************************************/
socket.on("connect", () => {
  console.log("🟢 Admin soporte conectado:", socket.id);
  socket.emit("soporte:join");
});

/*************************************************
 * 👥 LISTA DE USUARIOS
 *************************************************/
socket.on("soporte:usuarios", (usuariosArray) => {
  listaUsuarios.innerHTML = "";
  usuarios.clear();

  usuariosArray.forEach((u) => {
    usuarios.set(u._id, u);

    const li = document.createElement("li");
    li.dataset.id = u._id;
    li.className = "usuario-item";
    li.innerHTML = `
      <span class="nombre">${u.nombre}</span>
      <span class="badge" style="display:none">🔔</span>
    `;

    li.addEventListener("click", () => {
      userIdInput.value = u._id;
      chatBody.innerHTML = "";
      li.querySelector(".badge").style.display = "none";
    });

    listaUsuarios.appendChild(li);
  });

  totalConectados.textContent = usuariosArray.length;
});

/*************************************************
 * 🔍 FILTRAR USUARIOS
 *************************************************/
searchInput.addEventListener("input", () => {
  const filtro = searchInput.value.toLowerCase();
  listaUsuarios.querySelectorAll("li").forEach((li) => {
    li.style.display = li.textContent.toLowerCase().includes(filtro)
      ? ""
      : "none";
  });
});

/*************************************************
 * 💬 RECIBIR MENSAJES
 *************************************************/
socket.on("soporte:mensaje", (data) => {
  mensajesTotales++;
  totalMensajes.textContent = mensajesTotales;

  const activo = userIdInput.value === data.userId;
  const fromSoporte = data.from === "soporte";

  // 🔔 Badge si no está seleccionado
  if (!activo && !fromSoporte) {
    const li = listaUsuarios.querySelector(
      `li[data-id="${data.userId}"]`
    );
    if (li) li.querySelector(".badge").style.display = "inline";
  }

  // 🖥️ Mostrar mensaje
  if (activo || fromSoporte) {
    agregarMensaje(
      fromSoporte ? "soporte" : "usuario",
      fromSoporte ? "Yo" : data.nombre,
      data.mensaje
    );
  }
});

/*************************************************
 * 📤 ENVIAR MENSAJE
 *************************************************/
document.getElementById("sendBtn").addEventListener("click", enviarMensaje);
mensajeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") enviarMensaje();
});

function enviarMensaje() {
  const mensaje = mensajeInput.value.trim();
  const userId = userIdInput.value;

  if (!mensaje || !userId) return;

  socket.emit("soporte:mensaje", {
    userId,
    mensaje,
  });

  agregarMensaje("soporte", "Yo", mensaje);
  mensajeInput.value = "";
}

/*************************************************
 * 🧱 UI MENSAJE
 *************************************************/
function agregarMensaje(tipo, nombre, texto) {
  const div = document.createElement("div");
  div.className = `mensaje ${tipo}`;
  div.innerHTML = `<strong>${nombre}:</strong> ${texto}`;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

/*************************************************
 * 🧹 OPCIONES PANEL
 *************************************************/
document.getElementById("limpiarChat").addEventListener("click", () => {
  chatBody.innerHTML = "";
});

document.getElementById("alertaUsuarios").addEventListener("click", () => {
  alertasEnviadas++;
  document.getElementById(
    "alertas"
  ).textContent = `Alertas enviadas: ${alertasEnviadas}`;

  socket.emit("soporte:alerta", {
    mensaje: "⚠️ Mensaje global desde soporte",
  });
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.reload();
});
