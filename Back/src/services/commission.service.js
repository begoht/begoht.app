const CommissionSetting = require("../models/CommissionSetting");
const { COMISION_PLATAFORMA } = require("../config/constants");

const SETTING_KEY = "global";
const DEFAULT_RATE = Number.isFinite(Number(COMISION_PLATAFORMA))
  ? Number(COMISION_PLATAFORMA)
  : 0.15;
const MAX_RATE = 0.5;

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

function serialize(setting) {
  const rate = normalizeRate(setting?.rate);

  return {
    key: SETTING_KEY,
    rate,
    percentage: Number((rate * 100).toFixed(2)),
    updatedAt: setting?.updatedAt || null,
    updatedBy: setting?.updatedBy || null,
  };
}

async function ensureCommissionConfig() {
  const setting = await CommissionSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    { $setOnInsert: { key: SETTING_KEY, rate: DEFAULT_RATE } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .populate("updatedBy", "nombre telefono email")
    .lean();

  return serialize(setting);
}

async function getCommissionRate(options = {}) {
  const query = CommissionSetting.findOne({ key: SETTING_KEY }).select("rate").lean();
  if (options.session) query.session(options.session);

  const setting = await query;
  return normalizeRate(setting?.rate);
}

function calculateCommission(total, rate) {
  const amount = Math.max(0, Number(total || 0));
  return Math.round(amount * normalizeRate(rate));
}

async function updateCommissionConfig({ percentage, rate, updatedBy }) {
  const nextRate = rate != null
    ? normalizeRate(rate)
    : normalizeRate(Number(percentage) / 100);

  const setting = await CommissionSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    {
      $set: {
        key: SETTING_KEY,
        rate: nextRate,
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
  DEFAULT_RATE,
  MAX_RATE,
  ensureCommissionConfig,
  getCommissionRate,
  calculateCommission,
  updateCommissionConfig,
};
