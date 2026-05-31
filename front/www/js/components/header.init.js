function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("BeGO_user") || "null");
  } catch (error) {
    console.warn("No se pudo leer BeGO_user:", error);
    return null;
  }
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

function openNotifications() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission?.();
  }

  showHeaderToast("No tienes notificaciones nuevas.");

  const event = new CustomEvent("bego:toast", {
    detail: { message: "No tienes notificaciones nuevas." }
  });
  window.dispatchEvent(event);
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
  const input = document.getElementById("inputFoto");
  const avatar = document.getElementById("avatarBtn");
  if (!foto || !input || !avatar) return;

  const userName = user?.nombre || "Invitado";
  foto.src = user?.foto || "assets/logo_primcial.png";
  foto.onerror = () => {
    foto.src = `https://ui-avatars.com/api/?name=${getInitials(userName)}&background=111827&color=ffffff&bold=true`;
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
      localStorage.setItem("BeGO_user", JSON.stringify({
        ...(user || {}),
        foto: reader.result
      }));
    };
    reader.readAsDataURL(file);
  });
}

export function initHeader() {
  const user = getStoredUser();
  const nombreEl = document.getElementById("nombreUsuario");

  if (nombreEl) {
    nombreEl.textContent = user?.nombre || "Invitado";
  }

  bindAvatar(user);
  bindBackButton();
  bindNotifications();
}
