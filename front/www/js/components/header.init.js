import { getFreshAccessToken, getStoredAccessToken } from "../auth/session.js?v=20260710-photo-persist";
import { getServerUrl } from "../conexion.js";

function getStoredUser() {
  try {
    return (
      JSON.parse(localStorage.getItem("BeGO_user") || "null") ||
      JSON.parse(localStorage.getItem("usuario") || "null") ||
      JSON.parse(localStorage.getItem("user") || "null")
    );
  } catch (error) {
    console.warn("No se pudo leer usuario guardado:", error);
    return null;
  }
}

function getDisplayName(user) {
  const firstName = String(user?.nombre || "Invitado").trim().split(/\s+/)[0] || "Invitado";
  const lastName = String(user?.apellido || "").trim().split(/\s+/)[0];
  const fallbackLastName = String(user?.nombre || "")
    .trim()
    .split(/\s+/)
    .slice(1)
    .join(" ");
  const initial = (lastName || fallbackLastName).trim()[0];

  return initial ? `${firstName} ${initial.toUpperCase()}.` : firstName;
}

function getInitials(name = "Invitado") {
  return encodeURIComponent(
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join("") || "U"
  );
}

function normalizarFotoUrl(value = "") {
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

function openNotifications() {
  location.hash = "#/noticias";
}

function showHeaderToast(message) {
  let toast = document.getElementById("headerToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "headerToast";
    toast.className = "header-toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showHeaderToast.timer);
  showHeaderToast.timer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2200);
}

function persistUser(user = {}) {
  ["BeGO_user", "usuario", "user"].forEach((key) => {
    try {
      localStorage.setItem(key, JSON.stringify(user));
    } catch {}
  });
  if (user.rol) localStorage.setItem("rol", user.rol);
}

async function uploadProfilePhoto(file, currentUser = {}) {
  const formData = new FormData();
  if (currentUser.nombre) formData.append("nombre", currentUser.nombre);
  if (currentUser.email) formData.append("email", currentUser.email);
  formData.append("foto", file);

  let token = getStoredAccessToken();
  const request = () => fetch(`${getServerUrl().replace(/\/$/, "")}/api/users/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token || ""}` },
    body: formData
  });

  let response = await request();
  if (response.status === 401) {
    token = await getFreshAccessToken(0);
    response = await request();
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.msg || "No se pudo guardar la foto");
  }

  persistUser(data);
  return data;
}

function bindBackButton() {
  const backBtn = document.getElementById("headerBackBtn");
  if (!backBtn) return;

  backBtn.addEventListener("click", () => {
    if (history.length > 1) {
      history.back();
      return;
    }

    location.hash = "#/";
  });
}

function bindNotifications() {
  document.getElementById("btnNotificaciones")?.addEventListener("click", openNotifications);
}

function bindAvatar(user) {
  const foto = document.getElementById("fotoPerfil");
  const fallback = document.getElementById("avatarFallback");
  const input = document.getElementById("inputFoto");
  const avatar = document.getElementById("avatarBtn");
  if (!foto || !input || !avatar) return;

  const userName = getDisplayName(user);
  if (fallback) {
    fallback.textContent = decodeURIComponent(getInitials(userName)).slice(0, 2) || "B";
  }

  const fotoUrl = normalizarFotoUrl(user?.foto || user?.avatar || user?.photo || "");
  if (fotoUrl) {
    foto.src = fotoUrl;
    foto.style.display = "block";
    if (fallback) fallback.style.display = "none";
  }

  foto.onerror = () => {
    foto.removeAttribute("src");
    foto.style.display = "none";
    if (fallback) fallback.style.display = "grid";
    foto.onerror = null;
  };

  avatar.addEventListener("click", () => input.click());
  avatar.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.click();
    }
  });

  input.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      foto.src = reader.result;
      foto.style.display = "block";
      if (fallback) fallback.style.display = "none";
      persistUser({
        ...(getStoredUser() || user || {}),
        foto: reader.result
      });
    };
    reader.readAsDataURL(file);

    uploadProfilePhoto(file, getStoredUser() || user || {})
      .then((updatedUser) => {
        const updatedPhoto = normalizarFotoUrl(updatedUser?.foto || "");
        if (updatedPhoto) foto.src = updatedPhoto;
        showHeaderToast("Foto guardada");
      })
      .catch((error) => {
        console.error("No se pudo subir la foto:", error);
        showHeaderToast(error.message || "No se pudo guardar la foto");
      });
  });
}

export function initHeader() {
  const user = getStoredUser();
  const nombreEl = document.getElementById("nombreUsuario");

  if (nombreEl) {
    nombreEl.textContent = getDisplayName(user);
  }

  bindAvatar(user);
  bindBackButton();
  bindNotifications();
}
