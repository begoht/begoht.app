const WalletDiscountSetting = require("../models/WalletDiscountSetting");

const SETTING_KEY = "global";
const DEFAULT_RATE = 0;
const MAX_RATE = 0.5;
const DEFAULT_LABEL = "Remise Wallet";

function normalizeRate(value, fallback = DEFAULT_RATE) {
  let rate = Number(value);

  if (!Number.isFinite(rate)) {
    rate = fallback;
  }

  if (rate > 1) {
    rate /= 100;
  }

  return Math.min(MAX_RATE, Math.max(0, rate));
}

function cleanLabel(value) {
  const label = String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  return (label || DEFAULT_LABEL).slice(0, 48);
}

function serialize(setting) {
  const rate = normalizeRate(setting?.rate);
  const enabled = Boolean(setting?.enabled && rate > 0);

  return {
    key: SETTING_KEY,
    enabled,
    rate,
    percentage: Number((rate * 100).toFixed(2)),
    label: cleanLabel(setting?.label),
    badge: enabled ? `-${Number((rate * 100).toFixed(2)).toString().replace(/\.?0+$/, "")}%` : "",
    updatedAt: setting?.updatedAt || null,
    updatedBy: setting?.updatedBy || null,
  };
}

async function ensureWalletDiscountConfig(options = {}) {
  const query = WalletDiscountSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    {
      $setOnInsert: {
        key: SETTING_KEY,
        enabled: false,
        rate: DEFAULT_RATE,
        label: DEFAULT_LABEL,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("updatedBy", "nombre telefono email");

  if (options.session) query.session(options.session);

  const setting = await query.lean();
  return serialize(setting);
}

async function getWalletDiscountConfig(options = {}) {
  const query = WalletDiscountSetting.findOne({ key: SETTING_KEY });
  if (options.session) query.session(options.session);

  const setting = await query.lean();
  return serialize(setting);
}

function applyWalletDiscount(amount, config) {
  const base = Math.max(0, Math.round(Number(amount || 0)));
  const rate = normalizeRate(config?.rate);
  const enabled = Boolean(config?.enabled && rate > 0);
  const discountAmount = enabled ? Math.min(base, Math.round(base * rate)) : 0;
  const finalAmount = Math.max(0, base - discountAmount);

  return {
    basePrice: base,
    finalPrice: finalAmount,
    discountAmount,
    rate: enabled ? rate : 0,
    percentage: enabled ? Number((rate * 100).toFixed(2)) : 0,
    enabled,
    label: cleanLabel(config?.label),
  };
}

async function updateWalletDiscountConfig({ enabled, percentage, rate, label, updatedBy }) {
  const nextRate = rate != null
    ? normalizeRate(rate)
    : normalizeRate(Number(percentage) / 100);

  const setting = await WalletDiscountSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    {
      $set: {
        key: SETTING_KEY,
        enabled: Boolean(enabled) && nextRate > 0,
        rate: nextRate,
        label: cleanLabel(label),
        updatedBy: updatedBy || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .populate("updatedBy", "nombre telefono email")
    .lean();

  return serialize(setting);
}

module.exports = {
  DEFAULT_LABEL,
  DEFAULT_RATE,
  MAX_RATE,
  applyWalletDiscount,
  ensureWalletDiscountConfig,
  getWalletDiscountConfig,
  updateWalletDiscountConfig,
};
