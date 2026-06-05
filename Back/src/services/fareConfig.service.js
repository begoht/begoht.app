const FareSetting = require("../models/FareSetting");
const { TARIFA_BASE, PRECIO_POR_KM } = require("../config/tarifas");

const SETTING_KEY = "global";
const DEFAULT_BASE_FARE = Number.isFinite(Number(TARIFA_BASE)) ? Number(TARIFA_BASE) : 200;
const DEFAULT_PRICE_PER_KM = Number.isFinite(Number(PRECIO_POR_KM)) ? Number(PRECIO_POR_KM) : 60;
const MAX_AMOUNT = 100000;

function normalizeAmount(value, fallback) {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : fallback;
  return Math.min(MAX_AMOUNT, Math.max(0, Math.round(safeAmount)));
}

function serialize(setting) {
  return {
    key: SETTING_KEY,
    baseFare: normalizeAmount(setting?.baseFare, DEFAULT_BASE_FARE),
    pricePerKm: normalizeAmount(setting?.pricePerKm, DEFAULT_PRICE_PER_KM),
    currency: "HTG",
    updatedAt: setting?.updatedAt || null,
    updatedBy: setting?.updatedBy || null,
  };
}

async function ensureFareConfig(options = {}) {
  const query = FareSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    {
      $setOnInsert: {
        key: SETTING_KEY,
        baseFare: DEFAULT_BASE_FARE,
        pricePerKm: DEFAULT_PRICE_PER_KM,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("updatedBy", "nombre telefono email");

  if (options.session) query.session(options.session);

  const setting = await query.lean();
  return serialize(setting);
}

async function getFareConfig(options = {}) {
  const query = FareSetting.findOne({ key: SETTING_KEY });
  if (options.session) query.session(options.session);

  const setting = await query.lean();
  return serialize(setting);
}

async function updateFareConfig({ baseFare, pricePerKm, updatedBy }) {
  const nextBaseFare = normalizeAmount(baseFare, DEFAULT_BASE_FARE);
  const nextPricePerKm = normalizeAmount(pricePerKm, DEFAULT_PRICE_PER_KM);

  const setting = await FareSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    {
      $set: {
        key: SETTING_KEY,
        baseFare: nextBaseFare,
        pricePerKm: nextPricePerKm,
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
  DEFAULT_BASE_FARE,
  DEFAULT_PRICE_PER_KM,
  MAX_AMOUNT,
  ensureFareConfig,
  getFareConfig,
  updateFareConfig,
};
