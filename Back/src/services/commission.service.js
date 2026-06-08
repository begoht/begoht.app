const CommissionSetting = require("../models/CommissionSetting");
const { COMISION_PLATAFORMA } = require("../config/constants");

const SETTING_KEY = "global";
const DEFAULT_RATE = Number.isFinite(Number(COMISION_PLATAFORMA))
  ? Number(COMISION_PLATAFORMA)
  : 0.15;
const DEFAULT_DEBT_LIMIT = Number.isFinite(Number(process.env.DRIVER_COMMISSION_DEBT_LIMIT_HTG))
  ? Math.max(0, Math.round(Number(process.env.DRIVER_COMMISSION_DEBT_LIMIT_HTG)))
  : 1000;
const MAX_RATE = 0.5;
const MAX_DEBT_LIMIT = 1000000;

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
  const debtLimit = normalizeDebtLimit(setting?.debtLimit);

  return {
    key: SETTING_KEY,
    rate,
    percentage: Number((rate * 100).toFixed(2)),
    debtLimit,
    commissionDebtLimit: debtLimit,
    updatedAt: setting?.updatedAt || null,
    updatedBy: setting?.updatedBy || null,
  };
}

function normalizeDebtLimit(value, fallback = DEFAULT_DEBT_LIMIT) {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return fallback;
  return Math.min(MAX_DEBT_LIMIT, Math.max(0, Math.round(limit)));
}

async function ensureCommissionConfig() {
  const setting = await CommissionSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    { $setOnInsert: { key: SETTING_KEY, rate: DEFAULT_RATE, debtLimit: DEFAULT_DEBT_LIMIT } },
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

async function getCommissionDebtLimit(options = {}) {
  const query = CommissionSetting.findOne({ key: SETTING_KEY }).select("debtLimit").lean();
  if (options.session) query.session(options.session);

  const setting = await query;
  return normalizeDebtLimit(setting?.debtLimit);
}

function calculateCommission(total, rate) {
  const amount = Math.max(0, Number(total || 0));
  return Math.round(amount * normalizeRate(rate));
}

async function updateCommissionConfig({ percentage, rate, debtLimit, commissionDebtLimit, updatedBy }) {
  const nextRate = rate != null
    ? normalizeRate(rate)
    : normalizeRate(Number(percentage) / 100);
  const nextDebtLimit = normalizeDebtLimit(debtLimit ?? commissionDebtLimit);

  const setting = await CommissionSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    {
      $set: {
        key: SETTING_KEY,
        rate: nextRate,
        debtLimit: nextDebtLimit,
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
  DEFAULT_DEBT_LIMIT,
  MAX_RATE,
  MAX_DEBT_LIMIT,
  ensureCommissionConfig,
  getCommissionDebtLimit,
  getCommissionRate,
  calculateCommission,
  updateCommissionConfig,
};
