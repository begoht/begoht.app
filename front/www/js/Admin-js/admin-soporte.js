let token = localStorage.getItem("token");

if (!token) {
  window.location.replace("/login.html");
}

if (token?.startsWith('"') && token.endsWith('"')) {
  token = token.slice(1, -1);
}

const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : window.location.origin;

const socket = io(API_BASE, {
  auth: { token },
  transports: ["websocket"],
});

const listaUsuarios = document.getElementById("listaUsuarios");
const chatBody = document.getElementById("chatBody");
const mensajeInput = document.getElementById("mensaje");
const userIdInput = document.getElementById("userIdSeleccionado");
const searchInput = document.getElementById("searchUsuarios");
const totalConectados = document.getElementById("totalConectados");
const totalMensajes = document.getElementById("totalMensajes");
const alertas = document.getElementById("alertas");
const selectedUserName = document.getElementById("selectedUserName");
const selectedUserMeta = document.getElementById("selectedUserMeta");
const selectedAvatar = document.getElementById("selectedAvatar");
const contextUserName = document.getElementById("contextUserName");
const contextUserRole = document.getElementById("contextUserRole");
const sendBtn = document.getElementById("sendBtn");
const form = document.getElementById("adminChatForm");
const typingBox = document.getElementById("adminTyping");

const usuarios = new Map();
const conversaciones = new Map();
const unread = new Map();
const ownClientIds = new Set();

let usuarioActivo = "";
let mensajesTotales = 0;
let alertasEnviadas = 0;
let typingTimer = null;
let remoteTypingTimer = null;

socket.on("connect", () => {
  socket.emit("soporte:join");
});

socket.on("connect_error", (err) => {
  renderSystem(`Connexion support indisponible: ${err?.message || "erreur"}`);
});

socket.on("soporte:usuarios", (usuariosArray = []) => {
  usuarios.clear();

  usuariosArray.forEach((usuario) => {
    usuarios.set(usuario._id || usuario.id, usuario);
  });

  if (totalConectados) totalConectados.textContent = String(usuarios.size);
  renderUsuarios();
  syncSelectedUser();
});

socket.on("soporte:usuario-online", (usuario = {}) => {
  const id = usuario._id || usuario.id;
  if (!id) return;

  usuarios.set(id, { ...usuarios.get(id), ...usuario, online: true });
  if (totalConectados) totalConectados.textContent = String(usuarios.size);
  renderUsuarios();
});

socket.on("soporte:usuario-offline", (usuario = {}) => {
  const id = usuario._id || usuario.id;
  if (!id) return;

  usuarios.delete(id);
  if (totalConectados) totalConectados.textContent = String(usuarios.size);

  if (usuarioActivo === id) {
    setSelectedUser(null);
  }

  renderUsuarios();
});

socket.on("soporte:mensaje", (data = {}) => {
  const userId = data.userId;
  if (!userId) return;

  if (data.clientId && ownClientIds.has(data.clientId)) {
    return;
  }

  mensajesTotales += 1;
  if (totalMensajes) totalMensajes.textContent = String(mensajesTotales);

  addToConversation(userId, data);

  if (usuarioActivo === userId) {
    renderConversation(userId);
    socket.emit("soporte:read", { userId });
  } else if (data.from === "usuario") {
    unread.set(userId, (unread.get(userId) || 0) + 1);
    renderUsuarios();
  }
});

socket.on("soporte:typing", (data = {}) => {
  if (data.from !== "usuario") return;

  if (data.userId === usuarioActivo) {
    showTyping(Boolean(data.isTyping));
  }
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  enviarMensaje();
});

mensajeInput?.addEventListener("input", () => {
  if (!usuarioActivo) return;

  socket.emit("soporte:typing", {
    userId: usuarioActivo,
    isTyping: true,
  });

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit("soporte:typing", {
      userId: usuarioActivo,
      isTyping: false,
    });
  }, 900);
});

searchInput?.addEventListener("input", renderUsuarios);

document.getElementById("refreshUsuarios")?.addEventListener("click", () => {
  socket.emit("soporte:join");
});

document.querySelectorAll("[data-reply]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!usuarioActivo || !mensajeInput) return;
    mensajeInput.value = button.dataset.reply || "";
    mensajeInput.focus();
  });
});

document.getElementById("limpiarChat")?.addEventListener("click", () => {
  if (!usuarioActivo) return;
  conversaciones.set(usuarioActivo, []);
  renderConversation(usuarioActivo);
});

document.getElementById("alertaUsuarios")?.addEventListener("click", () => {
  alertasEnviadas += 1;
  if (alertas) alertas.textContent = String(alertasEnviadas);

  socket.emit("soporte:alerta", {
    mensaje: "Message important de l'assistance BeGO.",
  });
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.replace("/login.html");
});

function renderUsuarios() {
  if (!listaUsuarios) return;

  const filtro = (searchInput?.value || "").trim().toLowerCase();
  const items = Array.from(usuarios.values()).filter((usuario) => {
    const hayTexto = `${usuario.nombre || ""} ${usuario.rol || ""}`.toLowerCase();
    return !filtro || hayTexto.includes(filtro);
  });

  listaUsuarios.innerHTML = "";

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "support-user-empty";
    li.textContent = "Aucun utilisateur en ligne";
    listaUsuarios.appendChild(li);
    return;
  }

  items.forEach((usuario) => {
    const id = usuario._id || usuario.id;
    const li = document.createElement("li");
    li.className = `support-user-item ${usuarioActivo === id ? "active" : ""}`;
    li.dataset.id = id;

    const count = unread.get(id) || 0;
    li.innerHTML = `
      <div class="support-user-avatar">${initials(usuario.nombre)}</div>
      <div class="support-user-copy">
        <span>${escapeHtml(usuario.nombre || "Usuario BeGO")}</span>
        <small>${escapeHtml(usuario.rol || "usuario")} - en ligne</small>
      </div>
      ${count > 0 ? `<b>${count}</b>` : ""}
    `;

    li.addEventListener("click", () => setSelectedUser(usuario));
    listaUsuarios.appendChild(li);
  });
}

function setSelectedUser(usuario) {
  usuarioActivo = usuario?._id || usuario?.id || "";
  if (userIdInput) userIdInput.value = usuarioActivo;

  const hasUser = Boolean(usuarioActivo);
  if (mensajeInput) mensajeInput.disabled = !hasUser;
  if (sendBtn) sendBtn.disabled = !hasUser;

  if (!hasUser) {
    if (selectedUserName) selectedUserName.textContent = "Selectionnez un utilisateur";
    if (selectedUserMeta) selectedUserMeta.textContent = "Aucun chat actif";
    if (contextUserName) contextUserName.textContent = "-";
    if (contextUserRole) contextUserRole.textContent = "Selectionnez une conversation.";
    if (selectedAvatar) selectedAvatar.innerHTML = '<i class="fa-solid fa-headset"></i>';
    renderEmptyState();
    return;
  }

  unread.set(usuarioActivo, 0);
  if (selectedUserName) selectedUserName.textContent = usuario.nombre || "Usuario BeGO";
  if (selectedUserMeta) selectedUserMeta.textContent = `${usuario.rol || "usuario"} - conversation live`;
  if (contextUserName) contextUserName.textContent = usuario.nombre || "Usuario BeGO";
  if (contextUserRole) contextUserRole.textContent = `${usuario.rol || "usuario"} connecte maintenant.`;
  if (selectedAvatar) selectedAvatar.textContent = initials(usuario.nombre);

  socket.emit("soporte:read", { userId: usuarioActivo });
  renderUsuarios();
  renderConversation(usuarioActivo);
  mensajeInput?.focus();
}

function syncSelectedUser() {
  if (!usuarioActivo) return;
  const usuario = usuarios.get(usuarioActivo);
  if (!usuario) {
    setSelectedUser(null);
  }
}

function enviarMensaje() {
  const mensaje = mensajeInput?.value?.trim();
  const userId = usuarioActivo;

  if (!mensaje || !userId || !socket.connected) return;

  const clientId = `support-admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  ownClientIds.add(clientId);

  const optimistic = {
    id: clientId,
    clientId,
    mensaje,
    from: "soporte",
    nombre: "Support BeGO",
    userId,
    createdAt: new Date().toISOString(),
    status: "Envoi...",
  };

  addToConversation(userId, optimistic);
  renderConversation(userId);
  mensajeInput.value = "";
  sendBtn.disabled = true;

  socket.timeout(8000).emit("soporte:mensaje", { userId, mensaje, clientId }, (err, response) => {
    sendBtn.disabled = false;

    if (err || !response?.ok) {
      updateLocalMessage(userId, clientId, {
        status: "Non envoye",
        error: true,
      });
      renderConversation(userId);
      return;
    }

    updateLocalMessage(userId, clientId, {
      status: "Envoye",
      createdAt: response.createdAt || optimistic.createdAt,
    });
    renderConversation(userId);
  });
}

function addToConversation(userId, message) {
  const current = conversaciones.get(userId) || [];
  current.push(message);
  conversaciones.set(userId, current.slice(-80));
}

function updateLocalMessage(userId, clientId, patch) {
  const current = conversaciones.get(userId) || [];
  conversaciones.set(
    userId,
    current.map((message) =>
      message.clientId === clientId ? { ...message, ...patch } : message
    )
  );
}

function renderConversation(userId) {
  if (!chatBody) return;
  const messages = conversaciones.get(userId) || [];

  chatBody.innerHTML = "";

  if (!messages.length) {
    renderEmptyState("Conversation ouverte", "Aucun message dans cette session.");
    return;
  }

  messages.forEach((message) => {
    const div = document.createElement("div");
    div.className = `mensaje ${message.from === "soporte" ? "soporte" : "usuario"}`;

    const strong = document.createElement("strong");
    strong.textContent = message.from === "soporte" ? "Support" : message.nombre || "Utilisateur";
    div.appendChild(strong);

    const span = document.createElement("span");
    span.textContent = message.mensaje;
    div.appendChild(span);

    const meta = document.createElement("small");
    meta.className = message.error ? "error" : "";
    meta.textContent = message.status
      ? `${message.status} - ${formatTime(message.createdAt)}`
      : formatTime(message.createdAt);
    div.appendChild(meta);

    chatBody.appendChild(div);
  });

  scrollBottom();
}

function renderEmptyState(title = "Support live", text = "Choisissez un utilisateur connecte pour commencer.") {
  if (!chatBody) return;
  chatBody.innerHTML = `
    <div class="support-empty-state">
      <i class="fa-solid fa-comments"></i>
      <span>${escapeHtml(title)}</span>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function renderSystem(text) {
  if (!chatBody || usuarioActivo) return;
  chatBody.innerHTML = `
    <div class="support-empty-state warning">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span>Support</span>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function showTyping(show) {
  typingBox?.classList.toggle("hidden", !show);
  clearTimeout(remoteTypingTimer);

  if (show) {
    remoteTypingTimer = setTimeout(() => {
      typingBox?.classList.add("hidden");
    }, 2400);
  }
}

function scrollBottom() {
  requestAnimationFrame(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  });
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "B").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

function formatTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
