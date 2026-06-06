function cleanPhone(value = "") {
  return String(value || "").replace(/[\s().-]/g, "").trim();
}

function normalizeInternationalPhone(value = "") {
  const clean = cleanPhone(value);
  if (!clean) return "";

  if (clean.startsWith("+")) {
    return `+${clean.slice(1).replace(/\D/g, "")}`;
  }

  const digits = clean.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function requireInternationalPhone(value = "") {
  const clean = cleanPhone(value);
  const phone = normalizeInternationalPhone(value);

  if (!clean.startsWith("+") || !/^\+\d{8,15}$/.test(phone)) {
    const err = new Error("PHONE_INVALID");
    err.status = 400;
    throw err;
  }

  return phone;
}

function phoneLoginCandidates(value = "") {
  const normalized = normalizeInternationalPhone(value);
  const digits = cleanPhone(value).replace(/\D/g, "");
  const candidates = [
    normalized,
    digits,
    digits ? `+${digits}` : "",
  ].filter(Boolean);

  return [...new Set(candidates)];
}

module.exports = {
  normalizeInternationalPhone,
  phoneLoginCandidates,
  requireInternationalPhone,
};
