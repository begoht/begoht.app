import {
  clearSessionTokens,
  getStoredAccessToken,
  hasRefreshToken,
  isJwtExpired,
} from "./session.js";

function redirigirLogin() {
  clearSessionTokens();
  window.location.replace("registro.html");
}

export function validarToken() {
  const token = getStoredAccessToken();

  if (!token) {
    redirigirLogin();
    return null;
  }

  if (isJwtExpired(token)) {
    if (!hasRefreshToken()) {
      redirigirLogin();
      return null;
    }

    console.warn("Access token vencido. Se renovara automaticamente.");
  }

  return token;
}
