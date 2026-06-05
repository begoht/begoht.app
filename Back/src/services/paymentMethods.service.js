const crypto = require("crypto");

const PROVIDERS = Object.freeze({
  moncash: {
    id: "moncash",
    label: "MonCash",
    envPrefix: "MONCASH",
    requiredEnv: ["MONCASH_API_BASE_URL", "MONCASH_CLIENT_ID", "MONCASH_CLIENT_SECRET"],
  },
  natcash: {
    id: "natcash",
    label: "NatCash",
    envPrefix: "NATCASH",
    requiredEnv: ["NATCASH_API_BASE_URL", "NATCASH_API_KEY"],
  },
});

function normalizeProvider(value) {
  const provider = String(value || "").toLowerCase().trim();
  if (!PROVIDERS[provider]) {
    const err = new Error("PROVIDER_INVALID");
    err.status = 400;
    throw err;
  }
  return provider;
}

function normalizeHaitiPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const local = digits.startsWith("509") ? digits.slice(3) : digits;

  if (!/^\d{8}$/.test(local)) {
    const err = new Error("PHONE_INVALID");
    err.status = 400;
    throw err;
  }

  return {
    country: "HT",
    e164: `+509${local}`,
    local,
    last4: local.slice(-4),
    masked: `+509 **** ${local.slice(-4)}`,
  };
}

function getSecretSeed() {
  const seed =
    process.env.PAYMENT_METHOD_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.SECRET_KEY;

  if (!seed || String(seed).length < 16) {
    const err = new Error("PAYMENT_SECURITY_KEY_MISSING");
    err.status = 500;
    throw err;
  }

  return String(seed);
}

function getEncryptionKey() {
  return crypto.createHash("sha256").update(getSecretSeed()).digest();
}

function encryptText(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);

  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function hashPhone(value) {
  return crypto
    .createHmac("sha256", getSecretSeed())
    .update(String(value))
    .digest("hex");
}

function hashClientFingerprint(req) {
  const raw = `${req.ip || ""}|${req.get("user-agent") || ""}`;
  return crypto
    .createHmac("sha256", getSecretSeed())
    .update(raw)
    .digest("hex")
    .slice(0, 32);
}

function cleanAccountName(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function providerConfig(provider) {
  const meta = PROVIDERS[provider];
  const enabled = process.env[`${meta.envPrefix}_PAYMENTS_ENABLED`] === "true";
  const configured = meta.requiredEnv.every((name) => Boolean(process.env[name]));

  return {
    id: meta.id,
    label: meta.label,
    canLink: true,
    canPay: enabled && configured,
    status: enabled && configured ? "ready" : "link_only",
  };
}

function allProviderConfig() {
  return Object.keys(PROVIDERS).map(providerConfig);
}

function serializeMethod(method, configMap = null) {
  if (!method) return null;
  const source = typeof method.toObject === "function" ? method.toObject() : method;
  const provider = normalizeProvider(source.provider);
  const cfg = configMap?.[provider] || providerConfig(provider);

  return {
    id: String(source._id),
    provider,
    providerLabel: PROVIDERS[provider].label,
    type: source.type || "mobile_money",
    accountName: source.accountName || "",
    phoneMasked: `+509 **** ${source.phoneLast4 || "----"}`,
    phoneCountry: source.phoneCountry || "HT",
    status: source.status || "active",
    isDefault: Boolean(source.isDefault),
    verifiedAt: source.verifiedAt || null,
    canPay: Boolean(cfg.canPay && source.status === "active"),
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
  };
}

function serializeMethods(methods = []) {
  const configs = Object.fromEntries(allProviderConfig().map((item) => [item.id, item]));
  return methods.map((method) => serializeMethod(method, configs));
}

module.exports = {
  PROVIDERS,
  allProviderConfig,
  cleanAccountName,
  encryptText,
  hashClientFingerprint,
  hashPhone,
  normalizeHaitiPhone,
  normalizeProvider,
  providerConfig,
  serializeMethod,
  serializeMethods,
};
