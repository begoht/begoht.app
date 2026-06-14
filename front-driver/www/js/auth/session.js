let refreshPromise = null;

function cleanToken(value) {
  const token = String(value || "").trim();
  if (!token) return null;
  return token.startsWith('"') && token.endsWith('"')
    ? token.slice(1, -1)
    : token;
}

export function getDriverAccessToken() {
  return cleanToken(localStorage.getItem("token"));
}

export function getDriverRefreshToken() {
  return cleanToken(
    localStorage.getItem("refreshToken") ||
      localStorage.getItem("BeGO_driver_refreshToken")
  );
}

export function storeDriverTokens({ token, accessToken, refreshToken, user } = {}) {
  const nextAccessToken = cleanToken(accessToken || token);
  const nextRefreshToken = cleanToken(refreshToken);

  if (nextAccessToken) {
    localStorage.setItem("token", nextAccessToken);
  }

  if (nextRefreshToken) {
    localStorage.setItem("refreshToken", nextRefreshToken);
    localStorage.setItem("BeGO_driver_refreshToken", nextRefreshToken);
  }

  if (user) {
    localStorage.setItem("motorista", JSON.stringify(user));
  }

  localStorage.setItem("rol", "motorista");
  return nextAccessToken;
}

export function clearDriverSession() {
  [
    "token",
    "refreshToken",
    "BeGO_driver_refreshToken",
    "motorista",
    "usuario",
    "rol",
  ].forEach((key) => localStorage.removeItem(key));
}

export async function refreshDriverAccessToken(serverUrl = null) {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getDriverRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token");
    }

    const baseUrl = serverUrl ||
      (typeof window.getServerUrl === "function" ? window.getServerUrl() : "");
    const response = await fetch(`${baseUrl}/api/driver/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.msg || "Sesion expirada");
    }

    return storeDriverTokens(data);
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}
