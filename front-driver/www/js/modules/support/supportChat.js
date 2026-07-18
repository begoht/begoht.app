let listenersBound = false;
let joined = false;
let typingTimer = null;
let remoteTypingTimer = null;
const ownClientIds = new Set();
const seenMessages = new Set();

export function initDriverSupportChat() {
  injectStyles();
  bindDom();
  bindSocket();
  joinSupport();
}

function getSocket() {
  return window.socket || null;
}

function bindSocket() {
  const socket = getSocket();
  if (!socket || listenersBound) return;

  listenersBound = true;

  socket.on("connect", () => {
    joined = false;
    joinSupport();
    setStatus("Connecte", true);
  });

  socket.on("disconnect", () => {
    joined = false;
    setStatus("Reconnexion...", false);
  });

  socket.on("soporte:estado", ({ online } = {}) => {
    setStatus(online ? "Assistance en ligne" : "Hors ligne", Boolean(online));
  });

  socket.on("soporte:history", ({ mensajes = [] } = {}) => {
    const body = document.getElementById("driverSupportChatBody");
    if (!body) return;
    body.innerHTML = "";
    seenMessages.clear();
    mensajes.forEach((data) => {
      renderDriverSupportMessage({
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

    renderDriverSupportMessage({
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
    renderDriverSupportMessage({
      text: data.mensaje || "Message important de BeGO",
      type: "sistema",
    });
  });
}

function bindDom() {
  const form = document.getElementById("driverSupportForm");
  const input = document.getElementById("driverSupportInput");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendSupportMessage();
  });

  input?.addEventListener("input", () => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("soporte:typing", { isTyping: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit("soporte:typing", { isTyping: false });
    }, 900);
  });

  document.querySelectorAll("[data-driver-support-reply]").forEach((button) => {
    button.addEventListener("click", () => {
      const message = button.dataset.driverSupportReply || "";
      const inputEl = document.getElementById("driverSupportInput");
      if (!inputEl) return;
      inputEl.value = message;
      inputEl.focus();
    });
  });
}

function joinSupport() {
  const socket = getSocket();
  if (!socket || joined || !socket.connected) return;

  joined = true;
  socket.emit("soporte:join");
  setStatus("Connecte", true);
}

function sendSupportMessage() {
  const socket = getSocket();
  const input = document.getElementById("driverSupportInput");
  const sendBtn = document.getElementById("driverSupportSend");
  const text = input?.value?.trim();

  if (!socket || !socket.connected || !text) return;

  const clientId = `driver-support-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  ownClientIds.add(clientId);

  const messageEl = renderDriverSupportMessage({
    id: clientId,
    clientId,
    text,
    type: "usuario",
    status: "Envoi...",
  });

  input.value = "";
  if (sendBtn) sendBtn.disabled = true;
  socket.emit("soporte:typing", { isTyping: false });

  socket.timeout(8000).emit("soporte:mensaje", { mensaje: text, clientId }, (err, response) => {
    if (sendBtn) sendBtn.disabled = false;

    if (err || !response?.ok) {
      updateMessageStatus(messageEl, "Non envoye", true);
      return;
    }

    updateMessageStatus(messageEl, "Envoye", false, response.createdAt);
  });
}

function renderDriverSupportMessage({ id, clientId, text, type, name, status, time }) {
  const body = document.getElementById("driverSupportChatBody");
  if (!body || !text) return null;

  const key = id || clientId;
  if (key && seenMessages.has(key)) return null;
  if (key) seenMessages.add(key);

  const empty = body.querySelector(".driver-support-empty");
  if (empty) empty.remove();

  const div = document.createElement("div");
  div.className = `driver-support-message ${type}`;

  if (name && type === "soporte") {
    const strong = document.createElement("strong");
    strong.textContent = name;
    div.appendChild(strong);
  }

  const span = document.createElement("span");
  span.textContent = text;
  div.appendChild(span);

  if (type !== "sistema") {
    const meta = document.createElement("small");
    meta.className = "driver-support-meta";
    meta.textContent = status || formatTime(time || new Date());
    div.appendChild(meta);
  }

  body.appendChild(div);
  requestAnimationFrame(() => {
    body.scrollTop = body.scrollHeight;
  });

  return div;
}

function updateMessageStatus(messageEl, status, error = false, time = null) {
  const meta = messageEl?.querySelector(".driver-support-meta");
  if (!meta) return;

  meta.textContent = error ? status : `${status} - ${formatTime(time || new Date())}`;
  meta.classList.toggle("error", error);
}

function setStatus(text, online = true) {
  const status = document.getElementById("driverSupportStatus");
  const pill = document.getElementById("driverSupportLivePill");

  if (status) status.textContent = text;
  pill?.classList.toggle("offline", !online);
}

function showTyping(show) {
  const typing = document.getElementById("driverSupportTyping");
  typing?.classList.toggle("hidden", !show);
  clearTimeout(remoteTypingTimer);

  if (show) {
    remoteTypingTimer = setTimeout(() => {
      typing?.classList.add("hidden");
    }, 2400);
  }
}

function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function injectStyles() {
  if (document.getElementById("driverSupportChatStyles")) return;

  const style = document.createElement("style");
  style.id = "driverSupportChatStyles";
  style.textContent = `
    .driver-support-live {
      min-height: calc(100dvh - 160px);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto auto auto;
      overflow: hidden;
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.72);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 22px 60px rgba(2,6,23,0.26);
    }
    .driver-support-head {
      min-height: 74px;
      padding: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: rgba(255,255,255,0.06);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .driver-support-agent {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 11px;
    }
    .driver-support-agent i {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 8px;
      color: #dbeafe;
      background: linear-gradient(135deg, #2563eb, #0f172a);
      border: 1px solid rgba(255,255,255,0.16);
    }
    .driver-support-agent span,
    .driver-support-agent small {
      display: block;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .driver-support-agent span {
      font-weight: 900;
      font-size: 16px;
    }
    .driver-support-agent small {
      margin-top: 2px;
      color: rgba(226,232,240,0.68);
      font-size: 12px;
    }
    .driver-support-pill {
      min-height: 32px;
      padding: 0 10px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: #bbf7d0;
      background: rgba(34,197,94,0.12);
      border: 1px solid rgba(74,222,128,0.18);
      font-size: 12px;
      font-weight: 850;
    }
    .driver-support-pill::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 5px rgba(34,197,94,0.12);
    }
    .driver-support-pill.offline {
      color: #fecaca;
      background: rgba(239,68,68,0.12);
      border-color: rgba(248,113,113,0.18);
    }
    .driver-support-pill.offline::before {
      background: #ef4444;
      box-shadow: 0 0 0 5px rgba(239,68,68,0.12);
    }
    .driver-support-body {
      min-height: 0;
      padding: 14px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .driver-support-empty {
      margin: auto;
      width: min(420px, 100%);
      padding: 24px 16px;
      text-align: center;
      border-radius: 8px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .driver-support-empty i {
      width: 48px;
      height: 48px;
      display: inline-grid;
      place-items: center;
      margin-bottom: 10px;
      border-radius: 8px;
      color: #dbeafe;
      background: rgba(37,99,235,0.2);
    }
    .driver-support-empty span {
      display: block;
      font-weight: 900;
    }
    .driver-support-empty p {
      margin: 6px 0 0;
      color: rgba(226,232,240,0.68);
      line-height: 1.45;
    }
    .driver-support-message {
      width: fit-content;
      max-width: min(84%, 460px);
      padding: 10px 12px 8px;
      border-radius: 16px;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .driver-support-message.usuario {
      align-self: flex-end;
      color: #eff6ff;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-bottom-right-radius: 5px;
    }
    .driver-support-message.soporte {
      align-self: flex-start;
      color: #f8fafc;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.1);
      border-bottom-left-radius: 5px;
    }
    .driver-support-message.sistema {
      align-self: center;
      max-width: 92%;
      text-align: center;
      color: rgba(226,232,240,0.72);
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 12px;
    }
    .driver-support-message strong,
    .driver-support-message span,
    .driver-support-message small {
      display: block;
    }
    .driver-support-message strong {
      margin-bottom: 4px;
      color: rgba(255,255,255,0.72);
      font-size: 11px;
    }
    .driver-support-message small {
      margin-top: 5px;
      color: rgba(255,255,255,0.62);
      font-size: 10px;
      text-align: right;
    }
    .driver-support-message small.error {
      color: #fecaca;
    }
    .driver-support-quick {
      display: flex;
      gap: 8px;
      padding: 8px 14px 6px;
      overflow-x: auto;
    }
    .driver-support-quick button {
      flex: 0 0 auto;
      min-height: 36px;
      padding: 0 13px;
      border-radius: 999px;
      color: #dbeafe;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      font-weight: 800;
    }
    .driver-support-typing {
      min-height: 28px;
      padding: 0 16px 6px;
      display: flex;
      align-items: center;
      gap: 5px;
      color: rgba(226,232,240,0.68);
    }
    .driver-support-typing.hidden {
      display: none;
    }
    .driver-support-typing span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #93c5fd;
      animation: driverSupportTyping 1.1s ease-in-out infinite;
    }
    .driver-support-typing span:nth-child(2) { animation-delay: 0.14s; }
    .driver-support-typing span:nth-child(3) { animation-delay: 0.28s; }
    .driver-support-typing small {
      margin-left: 5px;
      font-size: 12px;
    }
    @keyframes driverSupportTyping {
      0%, 100% { opacity: 0.35; transform: translateY(0); }
      50% { opacity: 1; transform: translateY(-2px); }
    }
    .driver-support-form {
      min-height: 72px;
      padding: 10px 14px 14px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 52px;
      gap: 10px;
      background: rgba(2,6,23,0.74);
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .driver-support-form input {
      min-width: 0;
      height: 48px;
      padding: 0 14px;
      border-radius: 8px;
      color: #f8fafc;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      outline: none;
    }
    .driver-support-form button {
      width: 52px;
      height: 48px;
      border: 0;
      border-radius: 8px;
      color: #eff6ff;
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
    }
    .driver-support-form button:disabled {
      opacity: 0.45;
    }
  `;
  document.head.appendChild(style);
}
