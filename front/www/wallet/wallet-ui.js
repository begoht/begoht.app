const moneyFormatter = new Intl.NumberFormat("fr-HT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let saldoVisible = localStorage.getItem("saldoVisible") === "true";

function money(value) {
  return moneyFormatter.format(Number(value || 0));
}

export function inicializarVisibilidad() {
  const toggleBtn = document.querySelector(".toggle-visibility");
  const saldoEl = document.getElementById("saldoWallet");
  const icon = toggleBtn?.querySelector("i");

  if (!toggleBtn || !saldoEl || toggleBtn.dataset.bound === "1") {
    renderSaldoActual();
    return;
  }

  toggleBtn.dataset.bound = "1";
  toggleBtn.addEventListener("click", () => {
    saldoVisible = !saldoVisible;
    localStorage.setItem("saldoVisible", String(saldoVisible));
    renderSaldoActual();
  });

  if (icon) {
    icon.className = saldoVisible ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
  }

  renderSaldoActual();
}

export function actualizarSaldo(saldo, saldoBloqueado = 0) {
  const saldoEl = document.getElementById("saldoWallet");
  const availableEl = document.getElementById("walletAvailableLabel");
  const blockedEl = document.getElementById("walletBlockedLabel");
  const modalSaldo = document.getElementById("saldoDisponibleModal");

  if (!saldoEl) return;

  const safeSaldo = Number(saldo || 0);
  const safeBlocked = Number(saldoBloqueado || 0);

  saldoEl.dataset.real = String(safeSaldo);
  if (availableEl) availableEl.textContent = money(safeSaldo);
  if (blockedEl) blockedEl.textContent = money(safeBlocked);
  if (modalSaldo) modalSaldo.textContent = `HTG ${money(safeSaldo)}`;

  renderSaldoActual();
}

export function renderSaldoActual() {
  const saldoEl = document.getElementById("saldoWallet");
  const toggleBtn = document.querySelector(".toggle-visibility");
  const icon = toggleBtn?.querySelector("i");

  if (!saldoEl) return;

  const saldoReal = Number(saldoEl.dataset.real || 0);
  saldoEl.textContent = saldoVisible ? money(saldoReal) : "***.**";
  saldoEl.classList.toggle("blur", !saldoVisible);

  if (icon) {
    icon.className = saldoVisible ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
  }
}

export function renderHistorial(movimientos = []) {
  renderHistorialEn("listaMovimientos", movimientos.slice(0, 5), true);
  renderHistorialEn("listaMovimientosModal", movimientos, false);

  const badge = document.getElementById("walletMovBadge");
  if (badge) badge.textContent = String(Math.min(99, movimientos.length));
}

function renderHistorialEn(id, movimientos, compacto) {
  const lista = document.getElementById(id);
  if (!lista) return;

  lista.innerHTML = "";

  if (!Array.isArray(movimientos) || movimientos.length === 0) {
    lista.innerHTML = `<div class="wallet-history-empty">Aucun mouvement pour le moment.</div>`;
    return;
  }

  movimientos.forEach((movimiento) => {
    const monto = Number(movimiento.monto || 0);
    const esIngreso = monto >= 0;
    const item = document.createElement("div");
    item.className = "service-item";

    item.innerHTML = `
      <div class="service-icon">
        <i class="fa-solid ${esIngreso ? "fa-arrow-down" : "fa-arrow-up"}" style="color:${esIngreso ? "#22c55e" : "#f87171"};"></i>
      </div>
      <div class="service-info">
        <h3>${formatTipo(movimiento.tipo)}</h3>
        <small>${formatFecha(movimiento.fecha)}${compacto ? "" : formatRef(movimiento.ref)}</small>
      </div>
      <div class="wallet-history-amount" style="margin-left:auto;">
        <strong style="color:${esIngreso ? "#86efac" : "#fecaca"};">${esIngreso ? "+" : ""}HTG ${money(monto)}</strong>
      </div>
    `;

    lista.appendChild(item);
  });
}

function formatTipo(tipo = "movimiento") {
  return String(tipo)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatFecha(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("fr-HT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRef(ref) {
  if (!ref) return "";
  return ` - ${String(ref).slice(0, 32)}`;
}
