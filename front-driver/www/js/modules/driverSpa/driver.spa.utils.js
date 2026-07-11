export function pageShell(title, subtitle, content) {
  return `
    <div class="driver-page-shell">
      <header class="driver-page-header">
        <a class="driver-page-back" data-driver-route href="#/" aria-label="Volver al inicio">
          <i class="fa-solid fa-arrow-left"></i>
        </a>
        <div>
          <span class="driver-eyebrow">${subtitle}</span>
          <h1>${title}</h1>
        </div>
      </header>
      ${content}
    </div>
  `;
}

export function kpi(label, value, caption, icon, valueId = "") {
  return `
    <article class="driver-kpi">
      <i class="fa-solid ${icon}"></i>
      <span>${label}</span>
      <strong ${valueId ? `id="${valueId}"` : ""}>${value}</strong>
      <small>${caption}</small>
    </article>
  `;
}

export function listItem(title, text, icon, route = "") {
  const isExternal = /^https?:\/\//i.test(route) || /\.html(?:#.*)?$/i.test(route);
  const attrs = route
    ? isExternal
      ? `href="${route}" target="_blank" rel="noopener"`
      : `data-driver-route href="${route}"`
    : "";
  const tag = route ? "a" : "article";

  return `
    <${tag} class="driver-list-item" ${attrs}>
      <i class="fa-solid ${icon}"></i>
      <div>
        <strong>${title}</strong>
        <span>${text}</span>
      </div>
      <i class="fa-solid fa-chevron-right"></i>
    </${tag}>
  `;
}

export function actionTile(label, icon, route) {
  return `
    <a class="driver-action-tile" data-driver-route href="${route}">
      <i class="fa-solid ${icon}"></i>
      <span>${label}</span>
    </a>
  `;
}

export function toggleItem(label, checked) {
  return `
    <label class="driver-toggle-row">
      <span>${label}</span>
      <input type="checkbox" ${checked ? "checked" : ""}>
    </label>
  `;
}

export function renderDriverTripRow(viaje) {
  const estado = viaje.estado || "pendiente";
  const pasajero = viaje.pasajero?.nombre || "Pasajero";
  const origen = shortAddress(viaje.origen?.direccion, "Origen");
  const destino = shortAddress(viaje.destino?.direccion, "Destino");
  const amount = Number(viaje.paBeGOrista || viaje.precio || 0);

  return `
    <article class="driver-trip-row ${estado}">
      <div class="driver-trip-icon">
        <i class="fa-solid ${estado === "cancelado" ? "fa-ban" : "fa-motorcycle"}"></i>
      </div>
      <div class="driver-trip-main">
        <div class="driver-trip-top">
          <strong>${titleCase(estado)}</strong>
          <span>${formatMoney(amount)} G</span>
        </div>
        <p>${origen} -> ${destino}</p>
        <small>${pasajero} - ${formatDate(viaje.finViajeAt || viaje.createdAt)}</small>
      </div>
    </article>
  `;
}

export function notifyDriverWallet(message, isError = false) {
  const hint = document.getElementById("driverCommissionPayHint");
  if (hint) {
    hint.textContent = message;
    hint.classList.toggle("is-error", !!isError);
  }
}

export function notifyDriverPin(message, isError = false) {
  const hint = document.getElementById("driverWalletPinHint");
  if (hint) {
    hint.textContent = message;
    hint.classList.toggle("is-error", !!isError);
  }
}

export function isWeakWalletPin(pin) {
  if (!/^\d{4}$/.test(pin)) return true;
  if (/^(\d)\1{3}$/.test(pin)) return true;
  return ["0123", "1234", "4321", "0000"].includes(pin);
}

export function updateAvailabilityCopy(state) {
  const pageStatus = document.getElementById("driverPageStatus");
  if (!pageStatus || !state) return;
  pageStatus.textContent = state.socketConnected ? "Compte BeGO" : "Connexion...";
}

export function normalizeRoute(value) {
  const clean = (value || "#/")
    .replace(/^#/, "")
    .replace(/\.html$/i, "");
  return clean && clean !== "#" ? clean : "/";
}

export function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("active");
  document.getElementById("backdrop")?.classList.remove("active");
}

export function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

export function loadingRow(text) {
  return `<div class="driver-empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><span>${text}</span></div>`;
}

export function emptyState(text) {
  return `<div class="driver-empty-state"><i class="fa-solid fa-inbox"></i><span>${text}</span></div>`;
}

export function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

export function shortAddress(value, fallback) {
  return (value || fallback).split(",")[0].trim();
}

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString();
}

export function formatMoney(value) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function isToday(viaje) {
  const date = new Date(viaje.finViajeAt || viaje.createdAt);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function isThisWeek(viaje) {
  const date = new Date(viaje.finViajeAt || viaje.createdAt);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

export function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatMovementType(value) {
  return titleCase(value || "Movimiento");
}
