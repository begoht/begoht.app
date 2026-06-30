import { getServerUrl } from "../conexion.js";
import { getStoredAccessToken } from "../auth/session.js";

const LAST_READ_KEY = "bego:news:last-read";
let initialized = false;

export async function initNotifications(socket) {
  if (initialized) return;
  initialized = true;
  bindRealtime(socket);
  fetchNews()
    .then((news) => updateUnreadBadge(hasUnreadNews(news)))
    .catch(() => updateUnreadBadge(false));
  await registerNativePush();
}

export async function fetchNews() {
  const response = await fetch(`${getServerUrl()}/api/notifications/news`, {
    headers: {
      Authorization: `Bearer ${getStoredAccessToken() || ""}`,
      "ngrok-skip-browser-warning": "true",
    },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data?.error || data?.msg || "No se pudieron cargar las noticias");
  return Array.isArray(data) ? data : [];
}

export function markNewsRead(news = []) {
  const latest = news[0]?.createdAt || new Date().toISOString();
  localStorage.setItem(LAST_READ_KEY, latest);
  updateUnreadBadge(false);
}

export function hasUnreadNews(news = []) {
  if (!news.length) return false;
  const lastRead = new Date(localStorage.getItem(LAST_READ_KEY) || 0).getTime();
  return new Date(news[0].createdAt).getTime() > lastRead;
}

function bindRealtime(socket) {
  if (!socket || socket.__newsBound) return;
  socket.__newsBound = true;
  socket.on("noticia:nueva", (news = {}) => {
    updateUnreadBadge(true);
    showNewsBanner(news);
    window.dispatchEvent(new CustomEvent("bego:news:new", { detail: news }));
  });
}

async function registerNativePush() {
  const push = window.Capacitor?.Plugins?.PushNotifications;
  if (!push?.register) return;

  try {
    await createAndroidChannels(push);
    const permission = await push.requestPermissions();
    if (permission?.receive !== "granted") return;

    await push.addListener("registration", async ({ value: token } = {}) => {
      if (!token) return;
      localStorage.setItem("bego:push-token", token);
      await saveDeviceToken(token);
    });
    await push.addListener("registrationError", (error) => {
      console.warn("No se pudo registrar push:", error?.error || error?.message || error);
    });
    await push.addListener("pushNotificationReceived", (notification = {}) => {
      updateUnreadBadge(notification?.data?.type === "news");
      showNewsBanner({ title: notification.title, message: notification.body });
    });
    await push.addListener("pushNotificationActionPerformed", ({ notification } = {}) => {
      if (notification?.data?.type === "news") location.hash = "#/noticias";
    });
    await push.register();
  } catch (error) {
    console.warn("Notificaciones push no disponibles:", error?.message || error);
  }
}

async function createAndroidChannels(push) {
  if (!push.createChannel) return;
  await push.createChannel({
    id: "bego-news",
    name: "Noticias BeGO",
    description: "Avisos importantes de BeGO",
    importance: 5,
    visibility: 1,
    vibration: true,
  }).catch(() => {});
}

async function saveDeviceToken(token) {
  const response = await fetch(`${getServerUrl()}/api/notifications/devices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStoredAccessToken() || ""}`,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      token,
      platform: window.Capacitor?.getPlatform?.() || "unknown",
    }),
  });
  if (!response.ok) throw new Error("No se pudo vincular el dispositivo");
}

function updateUnreadBadge(unread) {
  document.querySelectorAll(".header-dot").forEach((dot) => {
    dot.classList.toggle("hidden", !unread);
  });
}

function showNewsBanner(news = {}) {
  let banner = document.getElementById("begoNewsBanner");
  if (!banner) {
    banner = document.createElement("button");
    banner.id = "begoNewsBanner";
    banner.className = "bego-news-banner";
    banner.type = "button";
    banner.addEventListener("click", () => {
      banner.classList.remove("visible");
      location.hash = "#/noticias";
    });
    document.body.appendChild(banner);
  }
  banner.innerHTML = `
    <i class="fa-solid fa-bell"></i>
    <span><strong>${escapeHtml(news.title || "BeGO")}</strong>${escapeHtml(news.message || "Nueva noticia disponible")}</span>
  `;
  banner.classList.add("visible");
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => banner.classList.remove("visible"), 6500);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char]);
}
