import { getServerUrl } from "../conexion.js";

const DEFAULT_CONFIG = {
  enabled: false,
  percentage: 0,
  label: "Remise Wallet",
  badge: "",
};

let currentConfig = DEFAULT_CONFIG;

function findWalletButton() {
  return document.getElementById("btnPagoWallet")
    || document.querySelector(".btn-pago[onclick*=\"wallet\"]");
}

function formatPercent(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function normalizeConfig(config = {}) {
  const percentage = Number(config.percentage || 0);
  const enabled = Boolean(config.enabled && percentage > 0);

  return {
    enabled,
    percentage: enabled ? percentage : 0,
    label: String(config.label || DEFAULT_CONFIG.label).trim() || DEFAULT_CONFIG.label,
    badge: enabled ? (config.badge || `-${formatPercent(percentage)}%`) : "",
  };
}

export function getWalletDiscountConfig() {
  return currentConfig;
}

export function applyWalletDiscountToButton(config = currentConfig) {
  const button = findWalletButton();
  if (!button) return;

  const normalized = normalizeConfig(config);
  button.classList.add("btn-pago-wallet");
  button.dataset.walletDiscount = normalized.enabled ? "active" : "inactive";

  const baseText = "Wallet BeGO";
  button.innerHTML = normalized.enabled
    ? `<span class="btn-pago-main">Wallet BeGO</span><span class="wallet-discount-badge">${normalized.badge}</span>`
    : `<span class="btn-pago-main">${baseText}</span>`;

  button.setAttribute(
    "aria-label",
    normalized.enabled
      ? `${baseText}, ${normalized.label} ${normalized.badge}`
      : baseText
  );
}

export async function initWalletDiscountUI() {
  applyWalletDiscountToButton(currentConfig);

  try {
    const res = await fetch(`${getServerUrl()}/api/wallet-discount`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    currentConfig = normalizeConfig(await res.json());
  } catch (err) {
    console.warn("Wallet discount unavailable:", err.message);
    currentConfig = DEFAULT_CONFIG;
  }

  applyWalletDiscountToButton(currentConfig);
}
