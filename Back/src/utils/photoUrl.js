function getPublicBaseUrl() {
  return (
    process.env.PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    process.env.API_URL ||
    process.env.SERVER_URL ||
    ""
  ).replace(/\/$/, "");
}

function normalizePhotoUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;

  const base = getPublicBaseUrl();
  if (!base) return raw;

  try {
    return new URL(raw, `${base}/`).href;
  } catch {
    return raw;
  }
}

module.exports = {
  normalizePhotoUrl
};
