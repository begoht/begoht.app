import { getServerUrl } from "../conexion.js";

let refreshPromise = null;

function cleanToken(value = "") {
  const token = String(value || "").trim();
  if (token.startsWith('"') && token.endsWith('"')) return token.slice(1, -1);
  return token;
}

function decodeJwtPayload(token) {
  const payload = cleanToken(token).split(".")[1];
  if (!payload) return null;

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
  return JSON.parse(atob(padded));
}

export function getStoredAccessToken() {
  return cleanToken(localStorage.getItem("token") || localStorage.getItem("BeGO_token"));
}

export function getStoredRefreshToken() {
  return cleanToken(localStorage.getItem("refreshToken") || localStorage.getItem("BeGO_refreshToken"));
}

export function hasRefreshToken() {
  return Boolean(getStoredRefreshToken());
}

export function isJwtExpired(token, skewSeconds = 0) {
  try {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true;
    return payload.exp <= Math.floor(Date.now() / 1000) + Number(skewSeconds || 0);
  } catch {
    return true;
  }
}

export function storeAuthTokens({ accessToken, refreshToken } = {}) {
  if (accessToken) {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("BeGO_token", accessToken);
  }

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("BeGO_refreshToken", refreshToken);
  }
}

export function clearSessionTokens() {
  [
    "token",
    "BeGO_token",
    "refreshToken",
    "BeGO_refreshToken",
    "BeGO_user",
    "usuario",
    "user",
    "rol",
  ].forEach((key) => localStorage.removeItem(key));
}

export function redirectToLogin() {
  clearSessionTokens();
  window.location.replace("registro.html");
}

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token");
    }

    const response = await fetch(`${getServerUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.accessToken) {
      throw new Error(data?.msg || "Sesion expirada");
    }

    storeAuthTokens(data);
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("usuario", JSON.stringify(data.user));
      localStorage.setItem("BeGO_user", JSON.stringify(data.user));
      localStorage.setItem("rol", data.user.rol);
    }

    return data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function getFreshAccessToken(skewSeconds = 60) {
  const token = getStoredAccessToken();
  if (token && !isJwtExpired(token, skewSeconds)) return token;
  return refreshAccessToken();
}
