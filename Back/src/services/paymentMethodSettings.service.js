const PaymentMethodSetting = require("../models/PaymentMethodSetting");

const SETTING_KEY = "global";

const METHOD_META = Object.freeze({
  efectivo: {
    id: "efectivo",
    label: "Efectivo",
    type: "cash",
    icon: "fa-money-bill-wave",
    defaultEnabled: true,
    requiresProviderConfig: false,
    canLink: false,
  },
  wallet: {
    id: "wallet",
    label: "Wallet BeGO",
    type: "wallet",
    icon: "fa-wallet",
    defaultEnabled: true,
    requiresProviderConfig: false,
    canLink: false,
  },
  moncash: {
    id: "moncash",
    label: "MonCash",
    type: "mobile_money",
    icon: "fa-mobile-screen-button",
    defaultEnabled: false,
    requiresProviderConfig: true,
    envPrefix: "MONCASH",
    requiredEnv: ["MONCASH_API_BASE_URL", "MONCASH_CLIENT_ID", "MONCASH_CLIENT_SECRET"],
    canLink: true,
  },
  natcash: {
    id: "natcash",
    label: "NatCash",
    type: "mobile_money",
    icon: "fa-building-columns",
    defaultEnabled: false,
    requiresProviderConfig: true,
    envPrefix: "NATCASH",
    requiredEnv: ["NATCASH_API_BASE_URL", "NATCASH_API_KEY"],
    canLink: true,
  },
});

const METHOD_IDS = Object.keys(METHOD_META);
const DEFAULT_UNAVAILABLE_MESSAGE = "No disponible por ahora.";

function cleanText(value, fallback, maxLength = 80) {
  const text = String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return (text || fallback).slice(0, maxLength);
}

function providerConfigured(meta) {
  if (!meta.requiresProviderConfig) return true;
  if (process.env[`${meta.envPrefix}_PAYMENTS_ENABLED`] !== "true") return false;
  return meta.requiredEnv.every((name) => Boolean(process.env[name]));
}

function normalizeMethod(id, value = {}) {
  const meta = METHOD_META[id];
  const enabled = typeof value.enabled === "boolean"
    ? value.enabled
    : meta.defaultEnabled;
  const configured = providerConfigured(meta);

  return {
    id,
    label: cleanText(value.label, meta.label, 40),
    type: meta.type,
    icon: meta.icon,
    enabled,
    configured,
    canLink: Boolean(enabled && meta.canLink),
    canPay: Boolean(enabled && configured),
    status: !enabled ? "disabled" : configured ? "ready" : "needs_config",
    unavailableMessage: cleanText(
      value.unavailableMessage,
      `${meta.label} ${DEFAULT_UNAVAILABLE_MESSAGE.toLowerCase()}`,
      140
    ),
  };
}

function serialize(setting) {
  const source = setting?.methods || {};
  const methods = Object.fromEntries(
    METHOD_IDS.map((id) => [id, normalizeMethod(id, source[id])])
  );

  return {
    key: SETTING_KEY,
    methods,
    list: METHOD_IDS.map((id) => methods[id]),
    updatedAt: setting?.updatedAt || null,
    updatedBy: setting?.updatedBy || null,
  };
}

function defaultMethodsForInsert() {
  return Object.fromEntries(
    METHOD_IDS.map((id) => [
      id,
      {
        enabled: METHOD_META[id].defaultEnabled,
        label: METHOD_META[id].label,
        unavailableMessage: `${METHOD_META[id].label} ${DEFAULT_UNAVAILABLE_MESSAGE.toLowerCase()}`,
      },
    ])
  );
}

async function ensurePaymentMethodSettings(options = {}) {
  const query = PaymentMethodSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    {
      $setOnInsert: {
        key: SETTING_KEY,
        methods: defaultMethodsForInsert(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("updatedBy", "nombre telefono email");

  if (options.session) query.session(options.session);

  const setting = await query.lean();
  return serialize(setting);
}

async function getPaymentMethodSettings(options = {}) {
  const query = PaymentMethodSetting.findOne({ key: SETTING_KEY });
  if (options.session) query.session(options.session);

  const setting = await query.lean();
  return serialize(setting);
}

async function updatePaymentMethodSettings({ methods = {}, updatedBy }) {
  const current = await ensurePaymentMethodSettings();
  const $set = { updatedBy: updatedBy || null };

  for (const id of METHOD_IDS) {
    const incoming = methods[id] || {};
    const existing = current.methods[id] || METHOD_META[id];
    const enabled = typeof incoming.enabled === "boolean"
      ? incoming.enabled
      : Boolean(existing.enabled);

    $set[`methods.${id}.enabled`] = enabled;
    $set[`methods.${id}.label`] = cleanText(incoming.label, existing.label || METHOD_META[id].label, 40);
    $set[`methods.${id}.unavailableMessage`] = cleanText(
      incoming.unavailableMessage,
      existing.unavailableMessage || `${METHOD_META[id].label} ${DEFAULT_UNAVAILABLE_MESSAGE.toLowerCase()}`,
      140
    );
  }

  const setting = await PaymentMethodSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    { $set },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .populate("updatedBy", "nombre telefono email")
    .lean();

  return serialize(setting);
}

async function assertPaymentMethodCanPay(methodId) {
  const method = String(methodId || "").toLowerCase();
  if (!METHOD_META[method]) {
    const err = new Error("METODO_PAGO_INVALIDO");
    err.type = "pago_invalido";
    err.metodoPago = method;
    throw err;
  }

  const settings = await getPaymentMethodSettings();
  const config = settings.methods[method];
  if (!config?.canPay) {
    const err = new Error("PAGO_NO_DISPONIBLE");
    err.type = "pago_no_disponible";
    err.metodoPago = method;
    err.messageForUser = config?.unavailableMessage || DEFAULT_UNAVAILABLE_MESSAGE;
    throw err;
  }

  return method;
}

module.exports = {
  METHOD_IDS,
  METHOD_META,
  assertPaymentMethodCanPay,
  ensurePaymentMethodSettings,
  getPaymentMethodSettings,
  updatePaymentMethodSettings,
};
