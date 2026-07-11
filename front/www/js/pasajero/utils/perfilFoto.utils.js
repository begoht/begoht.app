export function normalizarFotoUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;

  const base = typeof window.getServerUrl === "function"
    ? window.getServerUrl()
    : window.location.origin;

  try {
    return new URL(raw, base).href;
  } catch {
    return raw;
  }
}

export function obtenerFotoPerfil(entity = {}) {
  return normalizarFotoUrl(
    entity.foto ||
    entity.avatar ||
    entity.photo ||
    entity.profilePhoto ||
    entity.profileImage ||
    entity.imagen ||
    ""
  );
}
