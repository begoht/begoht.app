import socket from "./conexionSocket.js?v=20260606-session-refresh";

const chatBody = document.getElementById("chatBody");
const input = document.getElementById("mensajeInput");
const enviarBtn = document.getElementById("enviarBtn");
const form = document.getElementById("supportChatForm");
const statusText = document.getElementById("supportStatus");
const livePill = document.getElementById("supportLivePill");
const typingBox = document.getElementById("supportTyping");
const backBtn = document.getElementById("supportBackBtn");

const ownClientIds = new Set();
const seenMessages = new Set();
let typingTimer = null;
let remoteTypingTimer = null;
let joined = false;

function setStatus(text, online = true) {
  if (statusText) statusText.textContent = text;
  livePill?.classList.toggle("offline", !online);
}

function joinSupport() {
  if (joined || !socket.connected) return;
  joined = true;
  socket.emit("soporte:join");
}

if (socket.connected) {
  joinSupport();
  setStatus("Connecte", true);
}

socket.on("connect", () => {
  joined = false;
  joinSupport();
  setStatus("Connecte", true);
});

socket.on("disconnect", () => {
  joined = false;
  setStatus("Reconnexion...", false);
});

socket.on("connect_error", (err) => {
  setStatus("Connexion indisponible", false);
  renderSystem(`Connexion impossible: ${err?.message || "erreur"}`);
});

socket.on("soporte:estado", ({ online } = {}) => {
  setStatus(online ? "Assistance en ligne" : "Hors ligne", Boolean(online));
});

socket.on("soporte:history", ({ mensajes = [] } = {}) => {
  if (!chatBody) return;
  chatBody.innerHTML = "";
  seenMessages.clear();
  mensajes.forEach((data) => {
    renderMessage({
      id: data.id,
      clientId: data.clientId,
      text: data.mensaje,
      type: data.from === "soporte" ? "soporte" : "usuario",
      name: data.from === "soporte" ? (data.nombre || "BeGO") : "Vous",
      time: data.createdAt,
    });
  });
});

socket.on("soporte:mensaje", (data = {}) => {
  if (data.from === "usuario" && data.clientId && ownClientIds.has(data.clientId)) {
    return;
  }

  if (data.from === "usuario") {
    return;
  }

  renderMessage({
    id: data.id,
    clientId: data.clientId,
    text: data.mensaje,
    type: data.from === "soporte" ? "soporte" : "sistema",
    name: data.nombre || "BeGO",
    time: data.createdAt,
  });

  socket.emit("soporte:read");
});

socket.on("soporte:typing", (data = {}) => {
  if (data.from !== "soporte") return;
  showTyping(Boolean(data.isTyping));
});

socket.on("soporte:alerta", (data = {}) => {
  renderSystem(data.mensaje || "Message important de BeGO");
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

input?.addEventListener("input", () => {
  socket.emit("soporte:typing", { isTyping: true });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit("soporte:typing", { isTyping: false });
  }, 900);
});

document.querySelectorAll("[data-quick-reply]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!input) return;
    input.value = button.dataset.quickReply || "";
    input.focus();
  });
});

backBtn?.addEventListener("click", () => {
  if (history.length > 1) {
    history.back();
  } else {
    window.location.href = "../index.html#/soporte";
  }
});

function sendMessage() {
  const text = input?.value?.trim();
  if (!text || !socket.connected) return;

  const clientId = `support-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  ownClientIds.add(clientId);

  const messageEl = renderMessage({
    id: clientId,
    clientId,
    text,
    type: "usuario",
    name: "Vous",
    status: "Envoi...",
  });

  input.value = "";
  enviarBtn.disabled = true;
  socket.emit("soporte:typing", { isTyping: false });

  socket.timeout(8000).emit("soporte:mensaje", { mensaje: text, clientId }, (err, response) => {
    enviarBtn.disabled = false;

    if (err || !response?.ok) {
      updateMessageStatus(messageEl, "Non envoye", true);
      return;
    }

    updateMessageStatus(messageEl, "Envoye", false, response.createdAt);
  });
}

function renderSystem(text) {
  renderMessage({ text, type: "sistema" });
}

function renderMessage({ id, clientId, text, type, name, status, time }) {
  if (!chatBody || !text) return null;

  const key = id || clientId;
  if (key && seenMessages.has(key)) return null;
  if (key) seenMessages.add(key);

  const div = document.createElement("div");
  div.className = `mensaje ${type}`;

  if (name && type !== "usuario" && type !== "sistema") {
    const strong = document.createElement("strong");
    strong.textContent = name;
    div.appendChild(strong);
  }

  const content = document.createElement("span");
  content.textContent = text;
  div.appendChild(content);

  if (type !== "sistema") {
    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = status || formatTime(time || new Date());
    div.appendChild(meta);
  }

  chatBody.appendChild(div);
  scrollBottom();
  return div;
}

function updateMessageStatus(messageEl, status, error = false, time = null) {
  const meta = messageEl?.querySelector(".message-meta");
  if (!meta) return;

  meta.textContent = error ? status : `${status} - ${formatTime(time || new Date())}`;
  meta.classList.toggle("error", error);
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

function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
