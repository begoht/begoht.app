import { getViajeEnCursoId, getEstadoViaje } from "../viajeControl/viajeEstado.js";

let initialized = false;
let activeViajeId = null;
let unread = 0;
let isOpen = false;
const seenMessages = new Set();

export function initDriverChat(socket) {
  if (!socket || initialized) return;
  initialized = true;

  injectStyles();
  ensureWidget();
  syncButton();

  socket.on("viaje-confirmado-motorista", ({ viaje } = {}) => {
    activeViajeId = viaje?._id || viaje?.id || activeViajeId;
    syncButton();
  });

  socket.on("viaje-asignado", (data = {}) => {
    activeViajeId = data.viajeId || data._id || activeViajeId;
    syncButton();
  });

  socket.on("iniciar-viaje-siguiente", (data = {}) => {
    activeViajeId = data.viajeId || data?.viaje?._id || activeViajeId;
    syncButton();
  });

  socket.on("viaje-finalizado", () => {
    clearChatMessages();
    activeViajeId = null;
    closeChat();
    syncButton();
  });

  socket.on("viaje:cancelado", () => {
      activeViajeId = null;
      closeChat();
      syncButton();
  });

  socket.on("viaje:chat:history", ({ viajeId, mensajes = [] } = {}) => {
    if (!isCurrentTrip(viajeId)) return;
    const body = document.getElementById("driverViajeChatBody");
    if (!body) return;

    body.innerHTML = "";
    seenMessages.clear();
    mensajes.forEach(renderMessage);
    scrollBottom();
  });

  socket.on("viaje:chat:mensaje", (mensaje = {}) => {
    if (!isCurrentTrip(mensaje.viajeId)) return;
    renderMessage(mensaje);

    if (!isOpen && mensaje.senderRole !== "motorista") {
      unread++;
      updateBadge();
    }
  });

  socket.on("viaje:chat:error", ({ mensaje } = {}) => {
    if (mensaje) showStatus(mensaje);
  });

  socket.on("viaje:chat:closed", ({ viajeId } = {}) => {
    if (!isCurrentTrip(viajeId)) return;
    
    clearChatMessages();
    closeChat();
    updateBadge();
  });
}

function ensureWidget() {
  const messageButton = document.getElementById("btnViajeMensaje");
  if (messageButton) {
    if (!document.getElementById("driverViajeChatBadge")) {
      const badge = document.createElement("span");
      badge.id = "driverViajeChatBadge";
      badge.className = "chat-badge hidden";
      badge.textContent = "0";
      messageButton.appendChild(badge);
    }

    if (!messageButton.dataset.chatReady) {
      messageButton.dataset.chatReady = "true";
      messageButton.addEventListener("click", openChat);
    }
  }

  if (!document.getElementById("driverViajeChatPanel")) {
    const panel = document.createElement("div");
    panel.id = "driverViajeChatPanel";
    panel.className = "viaje-chat-panel hidden";
    panel.innerHTML = `
      <div class="viaje-chat-card">
        <div class="viaje-chat-header">
          <strong>Chat pasajero</strong>
          <button id="btnCerrarDriverViajeChat" type="button" aria-label="Cerrar chat">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div id="driverViajeChatStatus" class="viaje-chat-status">Conectado con el pasajero</div>
        <div id="driverViajeChatBody" class="viaje-chat-body"></div>
        <form id="driverViajeChatForm" class="viaje-chat-form">
          <input id="driverViajeChatInput" type="text" maxlength="500" autocomplete="off" placeholder="Escribir un mensaje">
          <button type="submit"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector("#btnCerrarDriverViajeChat")?.addEventListener("click", closeChat);
    panel.querySelector("#driverViajeChatForm")?.addEventListener("submit", sendMessage);
  }
}

function syncButton() {
  ensureWidget();
  const btn = document.getElementById("btnViajeMensaje");
  if (!btn) return;

  const viajeId = getViajeEnCursoId() || activeViajeId || localStorage.getItem("viajeEnCursoId");
  const estado = getEstadoViaje();
  const visible = !!viajeId && ["asignado", "llego", "en_curso"].includes(estado || "asignado");

  btn.classList.toggle("hidden", !visible);
  btn.disabled = !visible;
  btn.setAttribute("aria-disabled", visible ? "false" : "true");
}

function openChat() {
  const socket = window.socket;
  const viajeId = getViajeEnCursoId() || activeViajeId || localStorage.getItem("viajeEnCursoId");
  if (!socket || !viajeId) return;

  activeViajeId = viajeId;
  ensureWidget();
  isOpen = true;
  unread = 0;
  updateBadge();

  document.getElementById("driverViajeChatPanel")?.classList.remove("hidden");
  document.getElementById("driverViajeChatInput")?.focus();
  socket.emit("viaje:chat:join", { viajeId });
}

function closeChat() {
  isOpen = false;
  document.getElementById("driverViajeChatPanel")?.classList.add("hidden");
}

function clearChatMessages() {
  seenMessages.clear();
  unread = 0;

  const body = document.getElementById("driverViajeChatBody");
  if (body) {
    body.innerHTML = "";
  }
}

function sendMessage(event) {
  event.preventDefault();
  const socket = window.socket;
  const input = document.getElementById("driverViajeChatInput");
  const texto = input?.value?.trim();
  const viajeId = getViajeEnCursoId() || activeViajeId || localStorage.getItem("viajeEnCursoId");

  if (!socket || !texto || !viajeId) return;

  const clientId = `motorista-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  socket.emit("viaje:chat:send", { viajeId, texto, clientId });
  input.value = "";
}

function renderMessage(mensaje) {
  const body = document.getElementById("driverViajeChatBody");
  if (!body) return;

  const key = mensaje.id || mensaje.clientId;
  if (key && seenMessages.has(key)) return;
  if (key) seenMessages.add(key);

  const item = document.createElement("div");
  item.className = `viaje-chat-msg ${mensaje.senderRole === "motorista" ? "own" : "peer"}`;
  item.textContent = mensaje.texto || "";
  body.appendChild(item);
  scrollBottom();
}

function isCurrentTrip(viajeId) {
  const current = getViajeEnCursoId() || activeViajeId || localStorage.getItem("viajeEnCursoId");
  return !!viajeId && !!current && String(viajeId) === String(current);
}

function scrollBottom() {
  const body = document.getElementById("driverViajeChatBody");
  if (body) body.scrollTop = body.scrollHeight;
}

function updateBadge() {
  const badge = document.getElementById("driverViajeChatBadge");
  if (!badge) return;
  badge.textContent = String(unread);
  badge.classList.toggle("hidden", unread <= 0);
}

function showStatus(texto) {
  const status = document.getElementById("driverViajeChatStatus");
  if (status) status.textContent = texto;
}

function injectStyles() {
  if (document.getElementById("driverViajeChatStyles")) return;

  const style = document.createElement("style");
  style.id = "driverViajeChatStyles";
  style.textContent = `
    #btnViajeMensaje.hidden, .chat-badge.hidden, .viaje-chat-panel.hidden { display: none !important; }
    #btnViajeMensaje { position: relative; }
    .chat-badge {
      position: absolute;
      top: 0;
      right: 10px;
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
      z-index: 5000;
      background: rgba(2, 6, 23, 0.46);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 12px;
      box-sizing: border-box;
      -webkit-backdrop-filter: blur(4px);
      backdrop-filter: blur(4px);
    }
    .viaje-chat-card {
      width: min(440px, 100%);
      height: min(430px, 64vh);
      background:
        linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(20, 184, 166, 0.08)),
        #0b1220;
      color: white;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      box-shadow: 0 22px 58px rgba(0,0,0,0.46);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .viaje-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px 6px;
    }
    .viaje-chat-header strong {
      font-size: 0.94rem;
    }
    .viaje-chat-header button {
      border: 0;
      background: rgba(255,255,255,0.08);
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 8px;
    }
    .viaje-chat-status {
      padding: 0 14px 8px;
      color: #94a3b8;
      font-size: 12px;
    }
    .viaje-chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 10px 12px;
      background: #020617;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .viaje-chat-msg {
      max-width: 78%;
      padding: 8px 10px;
      border-radius: 12px;
      line-height: 1.35;
      word-break: break-word;
      font-size: 13px;
    }
    .viaje-chat-msg.own {
      align-self: flex-end;
      background: #276ef1;
      color: white;
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
      padding: 10px;
      background: #0f172a;
    }
    .viaje-chat-form input {
      flex: 1;
      min-width: 0;
      border: 1px solid rgba(255,255,255,0.1);
      background: #020617;
      color: white;
      border-radius: 8px;
      padding: 10px;
      outline: none;
    }
    .viaje-chat-form button {
      width: 42px;
      border: 0;
      border-radius: 8px;
      background: linear-gradient(135deg, #2563eb, #0f766e);
      color: white;
      font-weight: 800;
    }
  `;
  document.head.appendChild(style);
}
