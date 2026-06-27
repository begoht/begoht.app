const AVAILABILITY_KEY = "driver:availability";

let socketRef = null;
let online = localStorage.getItem(AVAILABILITY_KEY) !== "0";
let lastPosition = null;
let lastHeading = null;

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

  if (position.heading != null && Number.isFinite(Number(position.heading))) {
    lastHeading = Number(position.heading);
  }
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
        ? "Mode ONLINE actif. Vous pouvez recevoir des courses."
        : "Mode OFFLINE actif. Les nouvelles offres sont en pause.",
      online ? "#16a34a" : "#f59e0b"
    );
  }

  if (!online) {
    Promise.all([
      import("./oferta/oferta.render.js?v=20260627-map-icons"),
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

  socketRef.emit("driver:availability", { disponible: online });

  if (lastPosition) {
    socketRef.emit("motoristas:ubicacion", {
      lat: lastPosition.lat,
      lng: lastPosition.lng,
      heading: lastHeading,
      disponible: online
    });
  }
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

  socketRef.on("driver:availability-sync", (payload = {}) => {
    const nextOnline = payload.disponible === true || payload.disponible === "true";
    setDriverAvailability(nextOnline, { silent: true });
  });

  socketRef.on("driver:commission-blocked", (status = {}) => {
    online = false;
    localStorage.setItem(AVAILABILITY_KEY, "0");
    renderAvailability();
    notifySubscribers();
    const deuda = Number(status.comisionPendiente || 0).toLocaleString("fr-HT");
    const limite = Number(status.comisionLimite || status.commissionDebtLimit || 0).toLocaleString("fr-HT");
    showToast(`Commission BeGO pendiente: ${deuda} G / limite ${limite} G. Paga en Wallet.`, "#dc2626");
  });
}

function renderAvailability() {
  const status = document.getElementById("onlineStatus");
  const btn = document.getElementById("driverAvailabilityToggle");
  const dot = document.getElementById("driverAvailabilityDot");
  const pageStatus = document.getElementById("driverPageStatus");

  const connected = !!socketRef?.connected;
  const label = !connected ? "SYNC" : online ? "ONLINE" : "OFFLINE";
  const mode = !connected ? "syncing" : online ? "online" : "offline";

  document.body.dataset.driverAvailability = mode;

  if (status) status.textContent = label;
  if (pageStatus) pageStatus.textContent = !connected ? "Connexion..." : "Compte BeGO";
  if (dot) dot.className = `driver-status-dot ${mode}`;

  if (btn) {
    btn.classList.toggle("is-online", online);
    btn.classList.toggle("is-offline", !online);
    btn.classList.toggle("is-syncing", !connected);
    btn.setAttribute("aria-pressed", online ? "true" : "false");
    btn.setAttribute("aria-label", `Etat motorista: ${label}`);

    if (!btn.querySelector(".driver-switch-track")) {
      btn.innerHTML = `
        <span class="driver-switch-track" aria-hidden="true">
          <span class="driver-switch-knob"><i class="fa-solid fa-power-off" aria-hidden="true"></i></span>
        </span>
        <span class="driver-switch-copy">
          <strong id="onlineStatus">${label}</strong>
        </span>
      `;
    }

    const switchLabel = btn.querySelector(".driver-switch-copy strong");
    const switchIcon = btn.querySelector(".driver-switch-knob i");

    if (switchLabel) {
      switchLabel.textContent = label;
    }

    if (switchIcon) {
      switchIcon.className = mode === "online"
        ? "fa-solid fa-bolt"
        : mode === "syncing"
          ? "fa-solid fa-rotate"
          : "fa-solid fa-power-off";
    }
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
      duration: 1800,
      gravity: "bottom",
      position: "center",
      style: { background: color, color: "#fff" }
    }).showToast();
    return;
  }

  let toast = document.getElementById("driverStatusToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "driverStatusToast";
    toast.style.cssText = [
      "position:fixed",
      "left:14px",
      "right:14px",
      "bottom:94px",
      "z-index:99999",
      "border-radius:8px",
      "padding:14px 16px",
      "color:#fff",
      "font-weight:900",
      "line-height:1.25",
      "box-shadow:0 18px 40px rgba(0,0,0,.3)"
    ].join(";");
    document.body.appendChild(toast);
  }

  toast.textContent = text;
  toast.style.background = color || "#111827";
  toast.hidden = false;
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}
