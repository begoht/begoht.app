import { getServerUrl } from "./conexion.js";

/*************************************************
 * LOGOUT – SPA READY
 *************************************************/
export function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn || logoutBtn.dataset.bound) return;

  logoutBtn.dataset.bound = "true";

  logoutBtn.onclick = async () => {
    console.log("🔒 Cerrando sesión...");

    const token = localStorage.getItem("token");

    try {
      if (token) {
        await fetch(`${getServerUrl()}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch {
      console.warn("⚠️ Backend logout falló");
    }

    try {
      if (window.socket?.connected) {
        window.socket.disconnect();
      }
    } catch {}

    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("rol");

    if (window.Capacitor) {
      window.location.replace("/registro.html");
    } else {
      window.location.href = "../registro.html";
    }
  };
}
