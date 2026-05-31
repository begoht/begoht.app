import { getDriverAvailability, onDriverAvailabilityChange } from "./driver.status.js";

let pageView = null;
let homeView = null;
let cleanupAvailability = null;
let lastRoute = "/";

const routes = {
  "/": renderHome,
  "/ganancias": renderGanancias,
  "/actividad": renderActividad,
  "/wallet": renderWallet,
  "/cuenta": renderCuenta,
  "/ajustes": renderAjustes,
  "/soporte": renderSoporte
};

export function initDriverSpa() {
  pageView = document.getElementById("driverPageView");
  homeView = document.getElementById("driverHomeView");

  bindNavigation();
  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("wallet:update", () => {
    if (lastRoute === "/wallet" || lastRoute === "/ganancias") initDriverPage(lastRoute);
  });
  window.addEventListener("driver:trip-finalized", (event) => {
    guardarViajeFinalizadoLocal(event.detail);
    refrescarPaginaDriver();
  });
  renderRoute();

  cleanupAvailability?.();
  cleanupAvailability = onDriverAvailabilityChange(updateAvailabilityCopy);

  if (window.socket && !window.socket.__driverSpaRefreshBound) {
    window.socket.__driverSpaRefreshBound = true;
    window.socket.on("driver:actividad-actualizada", (payload) => {
      guardarViajeFinalizadoLocal(payload);
      refrescarPaginaDriver();
    });
  }
}

function bindNavigation() {
  if (document.body.dataset.driverSpaBound === "1") return;
  document.body.dataset.driverSpaBound = "1";

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-driver-route]");
    if (!link) return;

    event.preventDefault();
    const route = link.getAttribute("href") || "#/";
    window.location.hash = route.startsWith("#") ? route : `#${route}`;
    closeSidebar();
  });
}

function renderRoute() {
  const route = normalizeRoute(window.location.hash);
  const renderer = routes[route] || routes["/"];
  const isHome = route === "/";
  lastRoute = route;

  document.body.classList.toggle("driver-page-active", !isHome);
  homeView?.classList.toggle("hidden", !isHome);
  pageView?.classList.toggle("hidden", isHome);

  if (!isHome && pageView) {
    pageView.innerHTML = renderer();
    initDriverPage(route);
  }

  document.querySelectorAll("[data-driver-route]").forEach((link) => {
    link.classList.toggle("active", normalizeRoute(link.getAttribute("href")) === route);
  });

  if (isHome) {
    window.map?.invalidateSize?.();
  }

  updateAvailabilityCopy(getDriverAvailability());
}

function initDriverPage(route) {
  if (route === "/actividad") loadDriverActivity();
  if (route === "/wallet") loadDriverWallet();
  if (route === "/ganancias") loadDriverEarnings();
  if (route === "/cuenta") hydrateDriverAccount();
}

function renderHome() {
  return "";
}

function renderGanancias() {
  return pageShell("Ganancias", "Resumen de rendimiento", `
    <section class="driver-kpi-grid">
      ${kpi("Hoy", "0 G", "Ingresos netos", "fa-sack-dollar", "driverKpiToday")}
      ${kpi("Semana", "0 G", "Proyeccion activa", "fa-chart-line", "driverKpiWeek")}
      ${kpi("Aceptacion", "100%", "Viajes tomados", "fa-circle-check", "driverKpiAcceptance")}
      ${kpi("Tiempo online", "0 h", "Sesion actual", "fa-stopwatch", "driverKpiOnline")}
    </section>

    <section class="driver-panel">
      <div class="driver-panel-title">
        <h2>Meta diaria</h2>
        <span id="driverDailyGoal">0 / 12 viajes</span>
      </div>
      <div class="driver-progress"><span id="driverDailyProgress" style="width: 0%"></span></div>
      <p class="driver-muted">Las metricas se actualizan con tus viajes finalizados y pagos capturados.</p>
    </section>

    <section class="driver-list" id="driverEarningsList">
      ${listItem("Cargando actividad", "Buscando tus viajes finalizados.", "fa-circle-notch")}
    </section>
  `);
}

function renderActividad() {
  const activeTrip = localStorage.getItem("viajeEnCursoId");
  return pageShell("Actividad", "Viajes y reservas", `
    <section class="driver-activity-hero">
      <div>
        <span class="driver-eyebrow">Estado actual</span>
        <h2>${activeTrip ? "Viaje en curso" : "Sin viaje activo"}</h2>
        <p>${activeTrip ? `ID ${activeTrip}` : "Cuando aceptes una oferta, aparecera el seguimiento aqui."}</p>
      </div>
      <i class="fa-solid fa-route"></i>
    </section>

    <section class="driver-kpi-grid driver-activity-stats">
      ${kpi("Hoy", "--", "Viajes", "fa-motorcycle", "driverTripsToday")}
      ${kpi("Ingresos", "--", "Finalizados", "fa-wallet", "driverIncomeToday")}
      ${kpi("Cancelados", "--", "Control", "fa-ban", "driverCancelledTrips")}
      ${kpi("Reservas", "--", "Pendientes", "fa-calendar-check", "driverReservedTrips")}
    </section>

    <section class="driver-panel">
      <div class="driver-panel-title">
        <h2>Historial</h2>
        <span id="driverActivityCount">--</span>
      </div>
      <div class="driver-filter-row">
        <button class="active" type="button" data-driver-filter="todos">Todos</button>
        <button type="button" data-driver-filter="finalizado">Finalizados</button>
        <button type="button" data-driver-filter="cancelado">Cancelados</button>
        <button type="button" data-driver-filter="reservado">Reservas</button>
      </div>
    </section>

    <section class="driver-activity-list" id="driverActivityList">
      ${loadingRow("Cargando actividad")}
    </section>
  `);
}

function renderWallet() {
  const saldo = document.getElementById("saldo")?.textContent || "0.00";
  return pageShell("Billetera", "Pagos y balance", `
    <section class="driver-wallet-hero">
      <span>Balance disponible</span>
      <strong id="driverWalletBalance">${saldo}</strong>
      <small id="driverWalletBlocked">Actualizado por wallet en tiempo real</small>
    </section>

    <section class="driver-action-grid">
      ${actionTile("Retirar", "fa-money-bill-transfer", "#/soporte")}
      ${actionTile("Recargar", "fa-plus", "#/wallet")}
      ${actionTile("Movimientos", "fa-receipt", "#/wallet")}
      ${actionTile("Seguridad", "fa-shield-halved", "#/cuenta")}
    </section>

    <section class="driver-list" id="driverWalletMovements">
      ${listItem("Cargando movimientos", "Buscando historial de wallet.", "fa-circle-notch")}
    </section>
  `);
}

function renderCuenta() {
  return pageShell("Cuenta", "Perfil profesional", `
    <section class="driver-profile-card">
      <div class="driver-avatar-xl"><i class="fa-solid fa-user"></i></div>
      <div>
        <span class="driver-eyebrow">Motorista verificado</span>
        <h2 id="driverAccountName">Motorista BeGO</h2>
        <p>Documentos, vehiculo y reputacion en un solo lugar.</p>
      </div>
    </section>

    <section class="driver-list">
      ${listItem("Datos personales", "Telefono, foto y documentos.", "fa-id-card", "#/ajustes")}
      ${listItem("Vehiculo", "Marca, placa, color y seguro.", "fa-motorcycle", "#/ajustes")}
      ${listItem("Reputacion", "Calificacion, puntualidad y comentarios.", "fa-star", "#/actividad")}
      ${listItem("Centro de seguridad", "PIN, huella y contactos de emergencia.", "fa-shield", "#/soporte")}
    </section>
  `);
}

function renderAjustes() {
  return pageShell("Ajustes", "Preferencias de trabajo", `
    <section class="driver-panel">
      <div class="driver-panel-title">
        <h2>Modo operativo</h2>
        <span id="driverPageStatus">--</span>
      </div>
      <p class="driver-muted">El boton superior controla si entras o sales del matching de viajes.</p>
    </section>

    <section class="driver-list">
      ${toggleItem("Sonido de ofertas", true)}
      ${toggleItem("Vibracion", true)}
      ${toggleItem("Aceptar reservas", true)}
      ${toggleItem("Modo bajo consumo", false)}
    </section>
  `);
}

function renderSoporte() {
  return pageShell("Soporte", "Ayuda para tu operacion", `
    <section class="driver-list">
      ${listItem("Chat con soporte", "Reporta problemas de pago, viaje o pasajero.", "fa-headset", "#/soporte")}
      ${listItem("Emergencia", "Acceso rapido durante un viaje activo.", "fa-life-ring", "#/soporte")}
      ${listItem("Guias", "Buenas practicas para viajes premium.", "fa-book-open", "#/actividad")}
    </section>
  `);
}

async function loadDriverActivity(filter = "todos") {
  const list = document.getElementById("driverActivityList");
  const count = document.getElementById("driverActivityCount");
  if (!list) return;

  bindActivityFilters();
  list.innerHTML = loadingRow("Cargando actividad");

  try {
    const viajes = mergeViajesLocales(await fetchDriverTrips());
    const todayTrips = viajes.filter(isToday);
    const finished = viajes.filter((v) => v.estado === "finalizado");
    const cancelled = viajes.filter((v) => v.estado === "cancelado");
    const reserved = viajes.filter((v) => v.estado === "reservado");
    const incomeToday = todayTrips
      .filter((v) => v.estado === "finalizado")
      .reduce((sum, v) => sum + Number(v.paBeGOrista || v.precio || 0), 0);

    setText("driverTripsToday", todayTrips.length);
    setText("driverIncomeToday", `${formatMoney(incomeToday)} G`);
    setText("driverCancelledTrips", cancelled.length);
    setText("driverReservedTrips", reserved.length);
    if (count) count.textContent = `${viajes.length} registros`;

    let visible = viajes;
    if (filter !== "todos") visible = viajes.filter((v) => v.estado === filter);

    if (!visible.length) {
      list.innerHTML = emptyState("No hay actividad para este filtro.");
      return;
    }

    list.innerHTML = visible.map(renderDriverTripRow).join("");
  } catch (err) {
    console.error(err);
    const locales = mergeViajesLocales([]);
    if (locales.length) {
      list.innerHTML = locales.map(renderDriverTripRow).join("");
      if (count) count.textContent = `${locales.length} registros locales`;
      return;
    }
    list.innerHTML = emptyState("No pudimos cargar la actividad.");
  }
}

async function loadDriverWallet() {
  const balance = document.getElementById("driverWalletBalance");
  const blocked = document.getElementById("driverWalletBlocked");
  const movements = document.getElementById("driverWalletMovements");
  if (!balance && !movements) return;

  try {
    const [wallet, items] = await Promise.all([
      fetchJson("/api/wallet"),
      fetchJson("/api/wallet/movimientos")
    ]);

    if (balance) balance.textContent = `${formatMoney(wallet?.saldo || 0)} G`;
    if (blocked) blocked.textContent = `Saldo retenido: ${formatMoney(wallet?.saldoBloqueado || 0)} G`;

    if (movements) {
      const list = Array.isArray(items) ? items.slice(0, 6) : [];
      movements.innerHTML = list.length
        ? list.map((m) => listItem(formatMovementType(m.tipo), `${formatMoney(m.monto)} G - ${formatDate(m.fecha)}`, "fa-receipt")).join("")
        : listItem("Sin movimientos recientes", "Los pagos apareceran aqui cuando cierres viajes.", "fa-wallet");
    }
  } catch (err) {
    console.error(err);
    if (movements) movements.innerHTML = emptyState("No pudimos cargar la billetera.");
  }
}

async function loadDriverEarnings() {
  const list = document.getElementById("driverEarningsList");
  try {
    const viajes = mergeViajesLocales(await fetchDriverTrips());
    const today = viajes.filter(isToday);
    const week = viajes.filter(isThisWeek);
    const completedToday = today.filter((v) => v.estado === "finalizado");
    const completedWeek = week.filter((v) => v.estado === "finalizado");
    const todayIncome = completedToday.reduce((sum, v) => sum + Number(v.paBeGOrista || v.precio || 0), 0);
    const weekIncome = completedWeek.reduce((sum, v) => sum + Number(v.paBeGOrista || v.precio || 0), 0);
    const accepted = viajes.length ? Math.round((viajes.filter((v) => v.estado !== "cancelado").length / viajes.length) * 100) : 100;
    const progress = Math.min(100, Math.round((completedToday.length / 12) * 100));

    setText("driverKpiToday", `${formatMoney(todayIncome)} G`);
    setText("driverKpiWeek", `${formatMoney(weekIncome)} G`);
    setText("driverKpiAcceptance", `${accepted}%`);
    setText("driverDailyGoal", `${completedToday.length} / 12 viajes`);
    const bar = document.getElementById("driverDailyProgress");
    if (bar) bar.style.width = `${progress}%`;

    if (list) {
      list.innerHTML = [
        listItem("Viajes de hoy", `${completedToday.length} completados`, "fa-motorcycle", "#/actividad"),
        listItem("Ingresos de semana", `${formatMoney(weekIncome)} G acumulados`, "fa-chart-line", "#/actividad"),
        listItem("Wallet", "Revisa pagos y movimientos", "fa-wallet", "#/wallet")
      ].join("");
    }
  } catch (err) {
    console.error(err);
    const locales = mergeViajesLocales([]);
    if (locales.length) {
      const todayIncome = locales
        .filter((v) => v.estado === "finalizado" && isToday(v))
        .reduce((sum, v) => sum + Number(v.paBeGOrista || v.precio || 0), 0);
      setText("driverKpiToday", `${formatMoney(todayIncome)} G`);
      setText("driverKpiWeek", `${formatMoney(todayIncome)} G`);
      if (list) list.innerHTML = listItem("Ultimo viaje finalizado", `${formatMoney(todayIncome)} G registrados localmente`, "fa-motorcycle", "#/actividad");
      return;
    }
    if (list) list.innerHTML = emptyState("No pudimos cargar tus ganancias.");
  }
}

function bindActivityFilters() {
  document.querySelectorAll("[data-driver-filter]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-driver-filter]").forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      loadDriverActivity(btn.dataset.driverFilter);
    });
  });
}

function hydrateDriverAccount() {
  const user = safeJson(localStorage.getItem("motorista")) || safeJson(localStorage.getItem("usuario")) || {};
  const name = user.nombre || localStorage.getItem("nombre") || document.getElementById("driverName")?.textContent || "Motorista BeGO";
  setText("driverAccountName", name);
}

function pageShell(title, subtitle, content) {
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

function kpi(label, value, caption, icon, valueId = "") {
  return `
    <article class="driver-kpi">
      <i class="fa-solid ${icon}"></i>
      <span>${label}</span>
      <strong ${valueId ? `id="${valueId}"` : ""}>${value}</strong>
      <small>${caption}</small>
    </article>
  `;
}

function listItem(title, text, icon, route = "") {
  const attrs = route ? `data-driver-route href="${route}"` : "";
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

function actionTile(label, icon, route) {
  return `
    <a class="driver-action-tile" data-driver-route href="${route}">
      <i class="fa-solid ${icon}"></i>
      <span>${label}</span>
    </a>
  `;
}

function toggleItem(label, checked) {
  return `
    <label class="driver-toggle-row">
      <span>${label}</span>
      <input type="checkbox" ${checked ? "checked" : ""}>
    </label>
  `;
}

function renderDriverTripRow(viaje) {
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

async function fetchDriverTrips() {
  const viajes = await fetchJson("/api/viajes/mis-viajes");
  return Array.isArray(viajes) ? viajes : [];
}

function guardarViajeFinalizadoLocal(payload = {}) {
  const viaje = payload.viaje || {
    _id: payload.viajeId,
    estado: "finalizado",
    precio: payload.total || 0,
    paBeGOrista: payload.neto || payload.total || 0,
    finViajeAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    origen: { direccion: "Origen" },
    destino: { direccion: "Destino" }
  };

  if (!viaje._id) return;

  const actuales = safeJson(localStorage.getItem("driver:viajes-finalizados")) || [];
  const sinDuplicado = actuales.filter((item) => String(item._id) !== String(viaje._id));
  sinDuplicado.unshift(viaje);
  localStorage.setItem("driver:viajes-finalizados", JSON.stringify(sinDuplicado.slice(0, 12)));
}

function mergeViajesLocales(viajes) {
  const locales = safeJson(localStorage.getItem("driver:viajes-finalizados")) || [];
  const ids = new Set(viajes.map((viaje) => String(viaje._id || viaje.id)));
  const faltantes = locales.filter((viaje) => viaje?._id && !ids.has(String(viaje._id)));
  return [...faltantes, ...viajes];
}

function refrescarPaginaDriver() {
  if (lastRoute === "/actividad" || lastRoute === "/ganancias" || lastRoute === "/wallet") {
    initDriverPage(lastRoute);
  }
}

async function fetchJson(path) {
  const serverUrl = typeof window.getServerUrl === "function" ? window.getServerUrl() : "";
  const token = localStorage.getItem("token");
  const res = await fetch(`${serverUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true"
    }
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function updateAvailabilityCopy(state) {
  const pageStatus = document.getElementById("driverPageStatus");
  if (!pageStatus || !state) return;
  pageStatus.textContent = state.socketConnected
    ? state.online ? "Conectado" : "Desconectado"
    : "Reconectando";
}

function normalizeRoute(value) {
  const clean = (value || "#/")
    .replace(/^#/, "")
    .replace(/\.html$/i, "");
  return clean && clean !== "#" ? clean : "/";
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("active");
  document.getElementById("backdrop")?.classList.remove("active");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function loadingRow(text) {
  return `<div class="driver-empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><span>${text}</span></div>`;
}

function emptyState(text) {
  return `<div class="driver-empty-state"><i class="fa-solid fa-inbox"></i><span>${text}</span></div>`;
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function shortAddress(value, fallback) {
  return (value || fallback).split(",")[0].trim();
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString();
}

function formatMoney(value) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function isToday(viaje) {
  const date = new Date(viaje.finViajeAt || viaje.createdAt);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isThisWeek(viaje) {
  const date = new Date(viaje.finViajeAt || viaje.createdAt);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMovementType(value) {
  return titleCase(value || "Movimiento");
}
