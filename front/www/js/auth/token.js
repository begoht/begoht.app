/*************************************************
 * 🔐 TOKEN HELPERS - BeGO
 *************************************************/

function redirigirLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("BeGO_user");

  window.location.replace("registro.html");
}

export function validarToken() {
  let token = localStorage.getItem("token");

  if (!token) {
    redirigirLogin();
    return null;
  }

  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    const ahora = Date.now() / 1000; // tiempo actual en segundos

    if (payload.exp && payload.exp < ahora) {
      console.warn("⏳ Token vencido");
      redirigirLogin();
      return null;
    }

    return token;

  } catch (err) {
    console.error("❌ Token inválido o corrupto");
    redirigirLogin();
    return null;
  }
}
