import { viajeState } from "../viaje/viaje.state.js";

let initialized = false;
let activeViajeId = null;
let unread = 0;
let isOpen = false;
const seenMessages = new Set();

export function initPasajeroChat(socket) {
  if (!socket || initialized) return;
  initialized = true;

  injectStyles();
  ensureWidget();
  syncChatButton();

  socket.on("viaje-asignado", (data = {}) => {
    activeViajeId = data.viajeId || viajeState.viajeId || activeViajeId;
    syncChatButton();
  });

  socket.on("viaje:estado", (data = {}) => {
    if (["asignado", "llego", "en_curso"].includes(data.estado)) {
      activeViajeId = data.viajeId || viajeState.viajeId || activeViajeId;
      syncChatButton();
    }
  });

  socket.on("viaje-finalizado", () => {
    clearChatMessages();
    activeViajeId = null;
    closeChat();
    syncChatButton();
  });

  ["viaje:cancelado", "viaje-expirado"].forEach((eventName) => {
    socket.on(eventName, () => {
      activeViajeId = null;
      closeChat();
      syncChatButton();
    });
  });

  socket.on("viaje:chat:history", ({ viajeId, mensajes = [] } = {}) => {
    if (!isCurrentTrip(viajeId)) return;
    const body = document.getElementById("viajeChatBody");
    if (!body) return;

    body.innerHTML = "";
    seenMessages.clear();
    mensajes.forEach((mensaje) => renderMessage(mensaje));
    scrollBottom();
  });

  socket.on("viaje:chat:mensaje", (mensaje = {}) => {
    if (!isCurrentTrip(mensaje.viajeId)) return;
    renderMessage(mensaje);

    if (!isOpen && mensaje.senderRole !== "pasajero") {
      unread++;
      updateBadge();
    }
  });

  socket.on("viaje:chat:error", ({ mensaje } = {}) => {
    if (mensaje) showChatStatus(mensaje);
  });

  socket.on("viaje:chat:closed", ({ viajeId } = {}) => {
    if (!isCurrentTrip(viajeId)) return;
    
    clearChatMessages();
    closeChat();
    updateBadge();
  });
}

function ensureWidget() {
  if (!document.getElementById("btnViajeChat")) {
    const actions = document.querySelector("#driverAsignado .driver-acciones");
    if (actions) {
      const btn = document.createElement("button");
      btn.id = "btnViajeChat";
      btn.className = "driver-btn chat";
      btn.type = "button";
      btn.innerHTML = '<i class="fa-solid fa-comments"></i> Chat <span id="viajeChatBadge" class="chat-badge hidden">0</span>';
      btn.addEventListener("click", openChat);
      actions.prepend(btn);
    }
  }

  if (!document.getElementById("viajeChatPanel")) {
    const panel = document.createElement("div");
    panel.id = "viajeChatPanel";
    panel.className = "viaje-chat-panel hidden";
    panel.innerHTML = `
      <div class="viaje-chat-card">
        <div class="viaje-chat-header">
          <strong>Chat del viaje</strong>
          <button id="btnCerrarViajeChat" type="button" aria-label="Cerrar chat">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div id="viajeChatStatus" class="viaje-chat-status">Conectado con tu motorista</div>
        <div id="viajeChatBody" class="viaje-chat-body"></div>
        <form id="viajeChatForm" class="viaje-chat-form">
          <input id="viajeChatInput" type="text" maxlength="500" autocomplete="off" placeholder="Escribe un mensaje">
          <button type="submit"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector("#btnCerrarViajeChat")?.addEventListener("click", closeChat);
    panel.querySelector("#viajeChatForm")?.addEventListener("submit", sendMessage);
  }
}

function syncChatButton() {
  ensureWidget();
  const btn = document.getElementById("btnViajeChat");
  if (!btn) return;

  const estado = viajeState.estado;
  const viajeId = viajeState.viajeId || activeViajeId;
  const visible = !!viajeId && ["asignado", "llego", "en_curso"].includes(estado);

  btn.classList.toggle("hidden", !visible);
}

function openChat() {
  const socket = window.socket;
  const viajeId = viajeState.viajeId || activeViajeId;
  if (!socket || !viajeId) return;

  activeViajeId = viajeId;
  ensureWidget();
  isOpen = true;
  unread = 0;
  updateBadge();

  document.getElementById("viajeChatPanel")?.classList.remove("hidden");
  document.getElementById("viajeChatInput")?.focus();
  socket.emit("viaje:chat:join", { viajeId });
}

function closeChat() {
  isOpen = false;
  document.getElementById("viajeChatPanel")?.classList.add("hidden");
}

function clearChatMessages() {
  seenMessages.clear();
  unread = 0;

  const body = document.getElementById("viajeChatBody");
  if (body) {
    body.innerHTML = "";
  }
}

function sendMessage(event) {
  event.preventDefault();
  const socket = window.socket;
  const input = document.getElementById("viajeChatInput");
  const texto = input?.value?.trim();
  const viajeId = viajeState.viajeId || activeViajeId;

  if (!socket || !texto || !viajeId) return;

  const clientId = `pasajero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  socket.emit("viaje:chat:send", { viajeId, texto, clientId });
  input.value = "";
}

function renderMessage(mensaje) {
  const body = document.getElementById("viajeChatBody");
  if (!body) return;

  const key = mensaje.id || mensaje.clientId;
  if (key && seenMessages.has(key)) return;
  if (key) seenMessages.add(key);

  const item = document.createElement("div");
  item.className = `viaje-chat-msg ${mensaje.senderRole === "pasajero" ? "own" : "peer"}`;
  item.textContent = mensaje.texto || "";
  body.appendChild(item);
  scrollBottom();
}

function isCurrentTrip(viajeId) {
  const current = viajeState.viajeId || activeViajeId;
  return !!viajeId && !!current && String(viajeId) === String(current);
}

function scrollBottom() {
  const body = document.getElementById("viajeChatBody");
  if (body) body.scrollTop = body.scrollHeight;
}

function updateBadge() {
  const badge = document.getElementById("viajeChatBadge");
  if (!badge) return;
  badge.textContent = String(unread);
  badge.classList.toggle("hidden", unread <= 0);
}

function showChatStatus(texto) {
  const status = document.getElementById("viajeChatStatus");
  if (status) status.textContent = texto;
}

function injectStyles() {
  if (document.getElementById("viajeChatStyles")) return;

  const style = document.createElement("style");
  style.id = "viajeChatStyles";
  style.textContent = `
    #btnViajeChat.hidden, .chat-badge.hidden, .viaje-chat-panel.hidden { display: none !important; }
    #btnViajeChat { position: relative; }
    .chat-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      border-radius: 99px;
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
    }
    .viaje-chat-panel {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(15, 23, 42, 0.42);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 14px;
    }
    .viaje-chat-card {
      width: min(440px, 100%);
      height: min(520px, 76vh);
      background: #0f172a;
      color: white;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 18px;
      box-shadow: 0 22px 70px rgba(0,0,0,0.45);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .viaje-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 8px;
    }
    .viaje-chat-header button {
      border: 0;
      background: rgba(255,255,255,0.08);
      color: white;
      width: 34px;
      height: 34px;
      border-radius: 50%;
    }
    .viaje-chat-status {
      padding: 0 16px 10px;
      color: #94a3b8;
      font-size: 12px;
    }
    .viaje-chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 12px 14px;
      background: #020617;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .viaje-chat-msg {
      max-width: 78%;
      padding: 10px 12px;
      border-radius: 14px;
      line-height: 1.35;
      word-break: break-word;
      font-size: 14px;
    }
    .viaje-chat-msg.own {
      align-self: flex-end;
      background: #22c55e;
      color: #052e16;
      border-bottom-right-radius: 5px;
    }
    .viaje-chat-msg.peer {
      align-self: flex-start;
      background: #1e293b;
      color: white;
      border-bottom-left-radius: 5px;
    }
    .viaje-chat-form {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: #0f172a;
    }
    .viaje-chat-form input {
      flex: 1;
      min-width: 0;
      border: 1px solid rgba(255,255,255,0.1);
      background: #020617;
      color: white;
      border-radius: 12px;
      padding: 12px;
      outline: none;
    }
    .viaje-chat-form button {
      width: 44px;
      border: 0;
      border-radius: 12px;
      background: #22c55e;
      color: #052e16;
      font-weight: 800;
    }
  `;
  document.head.appendChild(style);
}
