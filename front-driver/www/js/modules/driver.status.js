const AVAILABILITY_KEY = "driver:availability";

let socketRef = null;
let online = localStorage.getItem(AVAILABILITY_KEY) !== "0";
let lastPosition = null;

const subscribers = new Set();

export function initDriverStatus(socket) {
  socketRef = socket;
  bindAvailabilityButton();
  bindSocketEvents();
  renderAvailability();

  if (!lastPosition && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateDriverPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        publishAvailability();
      },
      () => publishAvailability(),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
    );
  }
}

export function isDriverOnline() {
  return online;
}

export function getDriverAvailability() {
  return {
    online,
    socketConnected: !!socketRef?.connected,
    lastPosition
  };
}

export function onDriverAvailabilityChange(handler) {
  if (typeof handler !== "function") return () => {};
  subscribers.add(handler);
  handler(getDriverAvailability());
  return () => subscribers.delete(handler);
}

export function updateDriverPosition(position) {
  if (!position || position.lat == null || position.lng == null) return;
  lastPosition = {
    lat: Number(position.lat),
    lng: Number(position.lng)
  };
}

export function setDriverAvailability(nextOnline, { silent = false } = {}) {
  online = !!nextOnline;
  localStorage.setItem(AVAILABILITY_KEY, online ? "1" : "0");
  renderAvailability();
  publishAvailability();
  notifySubscribers();

  if (!silent) {
    showToast(
      online
        ? "Estas conectado y disponible para viajes."
        : "Estas desconectado. No recibiras nuevas ofertas.",
      online ? "#16a34a" : "#f59e0b"
    );
  }

  if (!online) {
    Promise.all([
      import("./oferta/oferta.render.js?v=20260602-offer-ui-singleton"),
      import("./oferta/oferta.queue.js")
    ])
      .then(([{ limpiarOferta }, { limpiarColaOfertas }]) => {
        limpiarColaOfertas();
        limpiarOferta({ resetViaje: true });
      })
      .catch(() => {});
  }
}

export function publishAvailability() {
  if (!socketRef?.connected) return;

  if (lastPosition) {
    socketRef.emit("motoristas:ubicacion", {
      lat: lastPosition.lat,
      lng: lastPosition.lng,
      disponible: online
    });
  }

  socketRef.emit("driver:availability", { disponible: online });
}

function bindAvailabilityButton() {
  const btn = document.getElementById("driverAvailabilityToggle");
  if (!btn || btn.dataset.bound === "1") return;

  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    setDriverAvailability(!online);
  });
}

function bindSocketEvents() {
  if (!socketRef || socketRef.__driverStatusBound) return;
  socketRef.__driverStatusBound = true;

  socketRef.on("connect", () => {
    renderAvailability();
    publishAvailability();
  });

  socketRef.on("disconnect", () => {
    renderAvailability();
    notifySubscribers();
  });
}

function renderAvailability() {
  const status = document.getElementById("onlineStatus");
  const btn = document.getElementById("driverAvailabilityToggle");
  const dot = document.getElementById("driverAvailabilityDot");
  const pageStatus = document.getElementById("driverPageStatus");

  const connected = !!socketRef?.connected;
  const label = !connected ? "Reconectando" : online ? "Conectado" : "Desconectado";
  const mode = !connected ? "syncing" : online ? "online" : "offline";

  document.body.dataset.driverAvailability = mode;

  if (status) status.textContent = label;
  if (pageStatus) pageStatus.textContent = label;
  if (dot) dot.className = `driver-status-dot ${mode}`;

  if (btn) {
    btn.classList.toggle("is-online", online);
    btn.classList.toggle("is-offline", !online);
    btn.setAttribute("aria-pressed", online ? "true" : "false");
    btn.innerHTML = online
      ? '<i class="fa-solid fa-power-off"></i><span>Desconectar</span>'
      : '<i class="fa-solid fa-signal"></i><span>Conectar</span>';
  }
}

function notifySubscribers() {
  const payload = getDriverAvailability();
  subscribers.forEach((handler) => handler(payload));
  window.dispatchEvent(new CustomEvent("driver:availability-change", { detail: payload }));
}

function showToast(text, color) {
  if (typeof Toastify === "function") {
    Toastify({
      text,
      duration: 2600,
      gravity: "top",
      position: "center",
      style: { background: color, color: "#fff" }
    }).showToast();
    return;
  }

  console.log(text);
}
