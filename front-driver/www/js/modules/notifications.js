import { getDriverAccessToken } from "../auth/session.js";
import { recoverPendingOffer } from "./oferta/oferta.recovery.js?v=20260702-offer-recovery";

let initialized = false;

export async function initDriverNotifications(socket) {
  if (initialized) return;
  initialized = true;
  bindRealtime(socket);
  await registerNativePush(socket);
}

function bindRealtime(socket) {
  if (!socket || socket.__driverNewsBound) return;
  socket.__driverNewsBound = true;
  socket.on("noticia:nueva", (news = {}) => {
    showDriverNewsBanner(news);
    window.dispatchEvent(new CustomEvent("driver:news:new", { detail: news }));
  });
}

async function registerNativePush(socket) {
  const push = window.Capacitor?.Plugins?.PushNotifications;
  if (!push?.register) return;

  try {
    await createChannels(push);
    bindLocalNotificationActions(socket);
    const permission = await push.requestPermissions();
    if (permission?.receive !== "granted") return;

    await push.addListener("registration", async ({ value: token } = {}) => {
      if (!token) return;
      localStorage.setItem("bego:driver:push-token", token);
      await saveDeviceToken(token);
    });
    await push.addListener("registrationError", (error) => {
      console.warn("Registro push motorista:", error?.error || error?.message || error);
    });
    await push.addListener("pushNotificationReceived", async (notification = {}) => {
      const data = notification.data || {};
      if (data.type === "news") {
        showDriverNewsBanner({ title: notification.title, message: notification.body });
      } else if (data.type === "trip_offer") {
        recoverPendingOffer(socket, { reason: "push-received" });
      }
      await showForegroundLocalNotification(notification);
    });
    await push.addListener("pushNotificationActionPerformed", ({ notification } = {}) => {
      const data = notification?.data || {};
      window.location.hash = data.type === "news" ? "#/noticias" : "#/";
      window.dispatchEvent(new CustomEvent("driver:push-opened", { detail: data }));
      if (data.type === "trip_offer") {
        recoverPendingOffer(socket, { reason: "push-opened", force: true });
      }
    });
    await push.register();
  } catch (error) {
    console.warn("Push motorista no disponible:", error?.message || error);
  }
}

function bindLocalNotificationActions(socket) {
  const local = window.Capacitor?.Plugins?.LocalNotifications;
  if (!local?.addListener || local.__begoActionBound) return;
  local.__begoActionBound = true;
  local.addListener("localNotificationActionPerformed", ({ notification } = {}) => {
    const data = notification?.extra || {};
    window.location.hash = data.type === "news" ? "#/noticias" : "#/";
    window.dispatchEvent(new CustomEvent("driver:push-opened", { detail: data }));
    if (data.type === "trip_offer") {
      recoverPendingOffer(socket, { reason: "local-push-opened", force: true });
    }
  }).catch?.(() => {});
}

async function createChannels(push) {
  if (!push.createChannel) return;
  await Promise.all([
    push.createChannel({
      id: "bego-trips",
      name: "Nuevos viajes",
      description: "Ofertas de viaje para motoristas",
      importance: 5,
      visibility: 1,
      vibration: true,
    }).catch(() => {}),
    push.createChannel({
      id: "bego-news",
      name: "Noticias BeGO",
      description: "Avisos importantes de BeGO",
      importance: 5,
      visibility: 1,
      vibration: true,
    }).catch(() => {}),
  ]);
}

async function showForegroundLocalNotification(notification = {}) {
  const local = window.Capacitor?.Plugins?.LocalNotifications;
  if (!local?.schedule) return;
  const data = notification.data || {};
  await local.schedule({
    notifications: [{
      id: Math.floor(Date.now() % 2147483000),
      title: notification.title || (data.type === "trip_offer" ? "Nuevo viaje disponible" : "BeGO"),
      body: notification.body || "Tienes una nueva notificacion",
      channelId: data.type === "trip_offer" ? "bego-trips" : "bego-news",
      extra: data,
      schedule: { at: new Date(Date.now() + 150) },
    }],
  }).catch(() => {});
}

async function saveDeviceToken(token) {
  const response = await fetch(`${getServerUrl()}/api/notifications/devices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getDriverAccessToken() || ""}`,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      token,
      platform: window.Capacitor?.getPlatform?.() || "unknown",
    }),
  });
  if (!response.ok) throw new Error("No se pudo vincular el dispositivo motorista");
}

function showDriverNewsBanner(news = {}) {
  let banner = document.getElementById("driverNewsBanner");
  if (!banner) {
    banner = document.createElement("button");
    banner.id = "driverNewsBanner";
    banner.className = "driver-news-banner";
    banner.type = "button";
    banner.addEventListener("click", () => {
      banner.classList.remove("visible");
      window.location.hash = "#/noticias";
    });
    document.body.appendChild(banner);
  }
  banner.innerHTML = `
    <i class="fa-solid fa-bell"></i>
    <span><strong>${escapeHtml(news.title || "BeGO")}</strong>${escapeHtml(news.message || "Nueva noticia")}</span>
  `;
  banner.classList.add("visible");
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => banner.classList.remove("visible"), 6500);
}

function getServerUrl() {
  return typeof window.getServerUrl === "function"
    ? window.getServerUrl().replace(/\/$/, "")
    : window.location.origin.replace(/\/$/, "");
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char]);
}
