import { getDriverAvailability, onDriverAvailabilityChange } from "./driver.status.js?v=20260624-matching-heartbeat";
import { initDriverSupportChat } from "./support/supportChat.js?v=20260604-live-support";
import {
  clearDriverSession,
  getDriverAccessToken,
  refreshDriverAccessToken,
} from "../auth/session.js";

let pageView = null;
let homeView = null;
let cleanupAvailability = null;
let lastRoute = "/";

const routes = {
  "/": renderHome,
  "/ganancias": renderGanancias,
  "/actividad": renderActividad,
  "/creditos": renderCreditos,
  "/wallet": renderWallet,
  "/cuenta": renderCuenta,
  "/ajustes": renderAjustes,
  "/soporte": renderSoporte,
  "/legal": renderLegal
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
  if (route === "/creditos") loadDriverCredits();
  if (route === "/cuenta") {
    hydrateDriverAccount();
    bindDriverAccountSecurity();
  }
  if (route === "/soporte") initDriverSupportChat();
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

function renderCreditos() {
  return pageShell("Creditos", "Capital para motoristas top", `
    <section class="driver-credit-hero">
      <div class="driver-credit-ring" style="--credit-progress: 0deg">
        <div>
          <span id="driverCreditRingLabel">0%</span>
          <small>Rendimiento</small>
        </div>
      </div>
      <div class="driver-credit-copy">
        <span class="driver-eyebrow" id="driverCreditStatus">Evaluando</span>
        <h2 id="driverCreditAmount">--</h2>
        <p id="driverCreditCaption">Calculando elegibilidad automatica.</p>
      </div>
    </section>

    <section class="driver-credit-detail">
      <div>
        <span>Monto del credito</span>
        <strong id="driverCreditMonto">--</strong>
      </div>
      <div>
        <span>Cuota semanal</span>
        <strong id="driverCreditCuota">--</strong>
      </div>
      <div>
        <span>Tasa semanal</span>
        <strong id="driverCreditTasa">--</strong>
      </div>
    </section>

    <section class="driver-kpi-grid">
      ${kpi("Viajes", "--", "Finalizados", "fa-motorcycle", "driverCreditTrips")}
      ${kpi("Meta", "--", "Para activar credito", "fa-flag-checkered", "driverCreditGoal")}
      ${kpi("Semana", "--", "Viajes actuales", "fa-calendar-week", "driverCreditWeek")}
      ${kpi("Score", "--", "Rendimiento semanal", "fa-gauge-high", "driverCreditScore")}
    </section>

    <section class="driver-panel">
      <div class="driver-panel-title">
        <h2>Progreso</h2>
        <span id="driverCreditProgressLabel">--</span>
      </div>
      <div class="driver-progress"><span id="driverCreditProgress" style="width: 0%"></span></div>
      <p class="driver-muted" id="driverCreditHelp">Al llegar a 1000 viajes finalizados, BeGO calcula tu credito semanal automaticamente.</p>
    </section>

    <section class="driver-list" id="driverCreditList">
      ${loadingRow("Cargando creditos")}
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
      <span>Ganancia disponible</span>
      <strong id="driverWalletBalance">${saldo}</strong>
      <small id="driverWalletBlocked">Wallet BeGO para pagos digitales y retiros</small>
    </section>

    <section class="driver-wallet-split">
      <article class="driver-wallet-metric">
        <i class="fa-solid fa-money-bill-wave"></i>
        <span>Ganancia efectivo</span>
        <strong id="driverWalletCashGain">0 G</strong>
        <small>No retirable: ya fue cobrada en mano.</small>
      </article>
      <article class="driver-wallet-metric is-debt">
        <i class="fa-solid fa-file-invoice-dollar"></i>
        <span>Comision pendiente</span>
        <strong id="driverWalletCommissionDebt">0 G</strong>
        <small id="driverWalletCommissionLimit">Limite 0 G</small>
      </article>
    </section>

    <section class="driver-panel driver-wallet-pin-panel" id="driverWalletPinPanel">
      <div class="driver-panel-title">
        <h2>PIN Wallet</h2>
        <span id="driverWalletPinStatus">A configurar</span>
      </div>
      <p class="driver-muted">Crea un PIN privado de 4 digitos para proteger pagos, retiros y comisiones.</p>
      <div class="driver-wallet-pay-grid">
        <label>
          Nuevo PIN
          <input id="driverWalletNewPin" type="password" maxlength="4" inputmode="numeric" autocomplete="new-password" placeholder="4 digitos">
        </label>
        <label>
          Confirmar PIN
          <input id="driverWalletConfirmPin" type="password" maxlength="4" inputmode="numeric" autocomplete="new-password" placeholder="Repetir">
        </label>
      </div>
      <button class="driver-pay-commission-btn" id="driverCreateWalletPinBtn" type="button">
        <i class="fa-solid fa-lock"></i>
        Crear PIN wallet
      </button>
      <small id="driverWalletPinHint">No compartas este PIN con pasajeros ni soporte.</small>
    </section>

    <section class="driver-panel driver-commission-pay-panel">
      <div class="driver-panel-title">
        <h2>Pagar BeGO</h2>
        <span id="driverCommissionPayStatus">Al dia</span>
      </div>
      <p class="driver-muted">Usa saldo disponible para pagar la comision pendiente al alias oficial @bego.</p>
      <div class="driver-wallet-pay-grid">
        <label>
          Monto
          <input id="driverCommissionPayAmount" type="number" min="0" step="1" inputmode="numeric" placeholder="0">
        </label>
        <label>
          PIN wallet
          <input id="driverCommissionPayPin" type="password" maxlength="4" inputmode="numeric" placeholder="4 digitos">
        </label>
      </div>
      <button class="driver-pay-commission-btn" id="driverPayCommissionBtn" type="button">
        <i class="fa-solid fa-shield-halved"></i>
        Pagar comision
      </button>
      <small id="driverCommissionPayHint">Si alcanzas el limite, no recibiras nuevas ofertas hasta pagar.</small>
    </section>

    <section class="driver-action-grid">
      ${actionTile("Retirar", "fa-money-bill-transfer", "#/soporte")}
      ${actionTile("Creditos", "fa-hand-holding-dollar", "#/creditos")}
      ${actionTile("Recargar", "fa-plus", "#/wallet")}
      ${actionTile("Movimientos", "fa-receipt", "#/wallet")}
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
      ${listItem("Creditos BeGO", "Preaprobado automatico desde 1000 viajes.", "fa-hand-holding-dollar", "#/creditos")}
      ${listItem("Reputacion", "Calificacion, puntualidad y comentarios.", "fa-star", "#/actividad")}
      ${listItem("Centro de seguridad", "PIN, huella y contactos de emergencia.", "fa-shield", "#/soporte")}
      ${listItem("Legal et confiance", "Conditions, confidentialite et contact officiel.", "fa-scale-balanced", "#/legal")}
    </section>

    <section class="driver-panel">
      <button class="driver-pay-commission-btn" id="driverLogoutBtn" type="button">
        <i class="fa-solid fa-right-from-bracket"></i>
        Se deconnecter
      </button>
      <button class="driver-pay-commission-btn" id="driverDeleteAccountBtn" type="button">
        <i class="fa-solid fa-user-slash"></i>
        Supprimer mon compte
      </button>
      <small id="driverAccountSecurityHint"></small>
    </section>
  `);
}

function bindDriverAccountSecurity() {
  document.getElementById("driverLogoutBtn")?.addEventListener("click", async () => {
    const token = getDriverAccessToken();
    try {
      await fetch(`${getServerUrl()}/api/driver/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token || ""}` },
      });
    } catch {}
    clearDriverSession();
    window.socket?.disconnect?.();
    window.location.href = "login.html";
  });

  document.getElementById("driverDeleteAccountBtn")?.addEventListener("click", async () => {
    const confirmation = window.prompt("Ecrivez ELIMINAR pour confirmer:");
    if (String(confirmation || "").trim().toUpperCase() !== "ELIMINAR") return;
    const password = window.prompt("Entrez votre mot de passe actuel:");
    if (!password) return;

    const hint = document.getElementById("driverAccountSecurityHint");
    try {
      const response = await fetch(`${getServerUrl()}/api/users/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getDriverAccessToken() || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password, confirmation: "ELIMINAR" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Suppression impossible");
      clearDriverSession();
      window.socket?.disconnect?.();
      alert("Votre compte a ete supprime.");
      window.location.href = "login.html";
    } catch (error) {
      if (hint) hint.textContent = error.message || "Suppression impossible";
    }
  });
}

function getServerUrl() {
  return typeof window.getServerUrl === "function"
    ? window.getServerUrl().replace(/\/$/, "")
    : window.location.origin.replace(/\/$/, "");
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
      ${listItem("Legal et confiance", "Regles de service et confidentialite.", "fa-scale-balanced", "#/legal")}
    </section>
  `);
}

function renderLegal() {
  return pageShell("Legal", "Confiance BeGO", `
    <section class="driver-panel">
      <div class="driver-panel-title">
        <h2>Legal et confiance</h2>
        <span>Officiel</span>
      </div>
      <p class="driver-muted">Conditions, confidentialite, support officiel et regles des colis sont disponibles dans le document public BeGO.</p>
    </section>

    <section class="driver-list">
      ${listItem("Termes et conditions", "Utilisation de la plateforme, paiements et securite.", "fa-scale-balanced", "https://bego.com.ht/legal.html")}
      ${listItem("Politique de confidentialite", "Donnees de compte, GPS, wallet, support et securite.", "fa-user-shield", "https://bego.com.ht/legal.html#confidentialite")}
      ${listItem("Regles des colis", "Maximum 5 kg, objets interdits et code de livraison.", "fa-box", "https://bego.com.ht/legal.html#colis")}
      ${listItem("Support officiel", "Chat, email et reseaux sociaux BeGO.", "fa-headset", "#/soporte")}
    </section>
  `);
}

function renderSoporte() {
  return pageShell("Assistance", "Support en direct", `
    <section class="driver-support-live">
      <header class="driver-support-head">
        <div class="driver-support-agent">
          <i class="fa-solid fa-headset"></i>
          <div>
            <span>Assistance BeGO</span>
            <small id="driverSupportStatus">Connexion...</small>
          </div>
        </div>
        <div class="driver-support-pill" id="driverSupportLivePill">Live</div>
      </header>

      <div class="driver-support-body" id="driverSupportChatBody">
        <div class="driver-support-empty">
          <i class="fa-solid fa-comments"></i>
          <span>Chat en direct</span>
          <p>Les messages ne sont pas sauvegardes. Gardez cette page ouverte pendant l'assistance.</p>
        </div>
      </div>

      <div class="driver-support-quick">
        <button type="button" data-driver-support-reply="J'ai un probleme avec un paiement.">Paiement</button>
        <button type="button" data-driver-support-reply="J'ai besoin d'aide avec une course.">Course</button>
        <button type="button" data-driver-support-reply="Je veux parler a un agent.">Agent</button>
      </div>

      <div class="driver-support-typing hidden" id="driverSupportTyping">
        <span></span><span></span><span></span>
        <small>L'assistance ecrit...</small>
      </div>

      <form class="driver-support-form" id="driverSupportForm">
        <input id="driverSupportInput" type="text" maxlength="1000" autocomplete="off" placeholder="Ecrire un message">
        <button id="driverSupportSend" type="submit" aria-label="Envoyer">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </form>
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
  const cashGain = document.getElementById("driverWalletCashGain");
  const commissionDebt = document.getElementById("driverWalletCommissionDebt");
  const commissionLimit = document.getElementById("driverWalletCommissionLimit");
  const payStatus = document.getElementById("driverCommissionPayStatus");
  const payHint = document.getElementById("driverCommissionPayHint");
  const payAmount = document.getElementById("driverCommissionPayAmount");
  const movements = document.getElementById("driverWalletMovements");
  if (!balance && !movements) return;

  try {
    const [wallet, items] = await Promise.all([
      fetchJson("/api/wallet"),
      fetchJson("/api/wallet/movimientos")
    ]);

    const saldo = Number(wallet?.gananciaDisponible ?? wallet?.saldo ?? 0);
    const efectivo = Number(wallet?.gananciaEfectivo || 0);
    const deuda = Number(wallet?.comisionPendiente || 0);
    const limite = Number(wallet?.comisionLimite || wallet?.commissionDebtLimit || 0);
    const restante = Math.max(0, limite - deuda);
    const bloqueado = !!wallet?.bloqueadoPorComision;

    if (balance) balance.textContent = `${formatMoney(saldo)} G`;
    if (blocked) blocked.textContent = `Retenido: ${formatMoney(wallet?.saldoBloqueado || 0)} G`;
    if (cashGain) cashGain.textContent = `${formatMoney(efectivo)} G`;
    if (commissionDebt) commissionDebt.textContent = `${formatMoney(deuda)} G`;
    if (commissionLimit) commissionLimit.textContent = bloqueado
      ? `Limite alcanzado: ${formatMoney(limite)} G`
      : `Limite ${formatMoney(limite)} G - margen ${formatMoney(restante)} G`;
    if (payStatus) {
      payStatus.textContent = bloqueado ? "Bloqueado" : deuda > 0 ? "Pendiente" : "Al dia";
      payStatus.className = bloqueado ? "is-danger" : deuda > 0 ? "is-warning" : "is-ok";
    }
    if (payHint) payHint.textContent = deuda > 0
      ? `Puedes pagar hasta ${formatMoney(Math.min(saldo, deuda))} G con tu saldo disponible.`
      : "No tienes comision pendiente.";
    payHint?.classList.remove("is-error");
    if (payAmount && !payAmount.value) {
      payAmount.value = deuda > 0 ? String(Math.round(Math.min(saldo, deuda))) : "";
    }
    bindDriverWalletPinSetup(wallet);
    bindDriverCommissionPay(wallet);

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

function bindDriverCommissionPay(wallet = {}) {
  const btn = document.getElementById("driverPayCommissionBtn");
  if (!btn) return;

  const deuda = Number(wallet?.comisionPendiente || 0);
  const saldo = Number(wallet?.gananciaDisponible ?? wallet?.saldo ?? 0);
  const hasPin = wallet?.tienePin !== false;
  btn.disabled = !hasPin || deuda <= 0 || saldo <= 0;
  if (!hasPin) notifyDriverWallet("Crea tu PIN wallet antes de pagar comisiones.", true);
  if (btn.dataset.bound === "1") return;

  btn.dataset.bound = "1";
  btn.addEventListener("click", async () => {
    const amountEl = document.getElementById("driverCommissionPayAmount");
    const pinEl = document.getElementById("driverCommissionPayPin");
    const amount = Number(amountEl?.value || 0);
    const pin = String(pinEl?.value || "").replace(/\D/g, "").slice(0, 4);

    if (!Number.isFinite(amount) || amount <= 0) {
      notifyDriverWallet("Ingresa un monto valido.", true);
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      notifyDriverWallet("Ingresa tu PIN wallet de 4 digitos.", true);
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Procesando`;

    try {
      await fetchJson("/api/wallet/enviar", {
        method: "POST",
        body: {
          aliasDestino: "bego",
          monto: amount,
          pin,
          idempotencyKey: `driver-commission-${Date.now()}`
        }
      });
      if (pinEl) pinEl.value = "";
      if (amountEl) amountEl.value = "";
      notifyDriverWallet("Comision pagada correctamente.");
      await loadDriverWallet();
    } catch (err) {
      notifyDriverWallet(err.message || "No se pudo pagar la comision.", true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Pagar comision`;
    }
  });

}

function bindDriverWalletPinSetup(wallet = {}) {
  const panel = document.getElementById("driverWalletPinPanel");
  const status = document.getElementById("driverWalletPinStatus");
  const btn = document.getElementById("driverCreateWalletPinBtn");
  const first = document.getElementById("driverWalletNewPin");
  const confirm = document.getElementById("driverWalletConfirmPin");
  if (!panel || !btn) return;

  const hasPin = wallet?.tienePin !== false;
  panel.hidden = hasPin;
  if (status) {
    status.textContent = hasPin ? "PIN activo" : "A configurar";
    status.className = hasPin ? "is-ok" : "is-warning";
  }
  if (hasPin) return;

  if (panel.dataset.inputBound !== "1") {
    panel.dataset.inputBound = "1";
    [first, confirm].forEach((input) => {
      input?.addEventListener("input", () => {
        input.value = String(input.value || "").replace(/\D/g, "").slice(0, 4);
        notifyDriverPin("No compartas este PIN con pasajeros ni soporte.");
      });
    });
  }

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", async () => {
    const pin = String(first?.value || "").replace(/\D/g, "").slice(0, 4);
    const repeated = String(confirm?.value || "").replace(/\D/g, "").slice(0, 4);

    if (!/^\d{4}$/.test(pin)) {
      notifyDriverPin("El PIN debe tener 4 digitos.", true);
      return;
    }

    if (pin !== repeated) {
      notifyDriverPin("Los PIN no coinciden.", true);
      return;
    }

    if (isWeakWalletPin(pin)) {
      notifyDriverPin("Elige un PIN mas seguro.", true);
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando`;

    try {
      await fetchJson("/api/wallet/configurar-pin", {
        method: "POST",
        body: { pin }
      });
      if (first) first.value = "";
      if (confirm) confirm.value = "";
      notifyDriverPin("PIN wallet creado correctamente.");
      await loadDriverWallet();
    } catch (err) {
      notifyDriverPin(err.message || "No se pudo crear el PIN wallet.", true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-lock"></i> Crear PIN wallet`;
    }
  });
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

async function loadDriverCredits() {
  const list = document.getElementById("driverCreditList");

  try {
    const data = await fetchJson("/api/driver/creditos/resumen");
    const monto = Number(data.montoCredito || 0);
    const cuota = Number(data.cuotaSemanal || 0);
    const tasa = Number(data.interesSemanal || 0) * 100;
    const viajes = Number(data.totalViajesFinalizados || 0);
    const minimo = Number(data.minimoViajes || 1000);
    const progreso = Math.min(100, Math.round((viajes / minimo) * 100));
    const score = Math.max(0, Math.min(160, Number(data.rendimientoSemanal || 0)));
    const ring = document.querySelector(".driver-credit-ring");

    if (ring) {
      ring.style.setProperty("--credit-progress", `${Math.min(100, score) * 3.6}deg`);
    }

    setText("driverCreditRingLabel", `${Math.round(score)}%`);
    setText("driverCreditStatus", data.elegible ? "Credito preaprobado" : "Construyendo elegibilidad");
    setText("driverCreditAmount", data.elegible ? `${formatMoney(monto)} G` : `${data.viajesRestantes || 0} viajes restantes`);
    setText(
      "driverCreditCaption",
      data.elegible
        ? "Monto calculado por tu volumen semanal y promedio reciente."
        : "Al completar 1000 viajes se activa la linea automaticamente."
    );
    setText("driverCreditMonto", data.elegible ? `${formatMoney(monto)} G` : "--");
    setText("driverCreditCuota", data.elegible ? `${formatMoney(cuota)} G` : "--");
    setText("driverCreditTasa", `${tasa.toFixed(2)}%`);
    setText("driverCreditTrips", viajes);
    setText("driverCreditGoal", `${progreso}%`);
    setText("driverCreditWeek", data.viajesSemanaActual || 0);
    setText("driverCreditScore", `${Math.round(score)}%`);
    setText("driverCreditProgressLabel", `${viajes} / ${minimo} viajes`);
    setText(
      "driverCreditHelp",
      data.elegible
        ? `Esta semana hiciste ${data.viajesSemanaActual || 0} viajes sobre una meta de ${data.objetivoSemanal || 0}.`
        : `Te faltan ${data.viajesRestantes || 0} viajes finalizados para activar creditos.`
    );

    const bar = document.getElementById("driverCreditProgress");
    if (bar) bar.style.width = `${progreso}%`;

    if (list) {
      list.innerHTML = data.elegible
        ? [
            listItem("Disponible ahora", `${formatMoney(monto)} G preaprobados`, "fa-circle-check"),
            listItem("Cuotas", `${data.cuotas || 16} pagos semanales de ${formatMoney(cuota)} G`, "fa-calendar-days"),
            listItem("Proximo cobro estimado", formatDate(data.proximoCobro), "fa-clock")
          ].join("")
        : [
            listItem("Aun no disponible", "La linea se activa al superar 1000 viajes finalizados.", "fa-lock"),
            listItem("Rendimiento semanal", `${Math.round(score)}% segun tus viajes de la semana.`, "fa-chart-simple"),
            listItem("Sigue completando viajes", "Cada viaje finalizado acerca tu credito automatico.", "fa-motorcycle")
          ].join("");
    }
  } catch (err) {
    console.error(err);
    if (list) list.innerHTML = emptyState("No pudimos cargar tus creditos.");
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

async function fetchJson(path, options = {}, retry = true) {
  const serverUrl = typeof window.getServerUrl === "function" ? window.getServerUrl() : "";
  const token = getDriverAccessToken();
  const res = await fetch(`${serverUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (res.status === 401 && retry) {
    try {
      await refreshDriverAccessToken(serverUrl);
      return fetchJson(path, options, false);
    } catch {
      clearDriverSession();
      window.location.href = "login.html";
      throw new Error("Sesion expirada");
    }
  }

  if (!res.ok) throw new Error(data?.error || data?.msg || `HTTP ${res.status}`);
  return data;
}

function notifyDriverWallet(message, isError = false) {
  const hint = document.getElementById("driverCommissionPayHint");
  if (hint) {
    hint.textContent = message;
    hint.classList.toggle("is-error", !!isError);
  }
}

function notifyDriverPin(message, isError = false) {
  const hint = document.getElementById("driverWalletPinHint");
  if (hint) {
    hint.textContent = message;
    hint.classList.toggle("is-error", !!isError);
  }
}

function isWeakWalletPin(pin) {
  if (!/^\d{4}$/.test(pin)) return true;
  if (/^(\d)\1{3}$/.test(pin)) return true;
  return ["0123", "1234", "4321", "0000"].includes(pin);
}

function updateAvailabilityCopy(state) {
  const pageStatus = document.getElementById("driverPageStatus");
  if (!pageStatus || !state) return;
  pageStatus.textContent = state.socketConnected ? "Compte BeGO" : "Connexion...";
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
