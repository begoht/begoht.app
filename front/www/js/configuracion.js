export function initConfiguracion() {

  const darkToggle = document.getElementById("darkMode");
  const simpleToggle = document.getElementById("simpleMode");
  const notificationsToggle = document.getElementById("notificationsMode");
  const logoutBtn = document.getElementById("logoutBtn");
  hydrateUser();

  if (!darkToggle || !simpleToggle) return;

  // =======================
  // DARK MODE
  // =======================
  const darkSaved = localStorage.getItem("darkMode") === "true";

  if (darkSaved) {
    document.body.classList.add("dark");
    darkToggle.checked = true;
  }

  darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", darkToggle.checked);
  });

  // =======================
  // SIMPLE MODE
  // =======================
  const simpleSaved = localStorage.getItem("simpleMode") === "true";

  simpleToggle.checked = simpleSaved;

  simpleToggle.addEventListener("change", () => {
    localStorage.setItem("simpleMode", simpleToggle.checked);
  });

  if (notificationsToggle) {
    notificationsToggle.checked = localStorage.getItem("notificationsMode") !== "false";
    notificationsToggle.addEventListener("change", () => {
      localStorage.setItem("notificationsMode", notificationsToggle.checked ? "true" : "false");
    });
  }

  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "1";
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("BeGO_token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("BeGO_refreshToken");
      localStorage.removeItem("rol");
      window.location.href = "registro.html";
    });
  }
}

function hydrateUser() {
  const user =
    safeJson(localStorage.getItem("BeGO_user")) ||
    safeJson(localStorage.getItem("usuario")) ||
    safeJson(localStorage.getItem("user")) ||
    {};

  const nombre = [user.nombre, user.apellido].filter(Boolean).join(" ").trim() || "Invitado";
  const iniciales = `${user.nombre?.[0] || "B"}${user.apellido?.[0] || ""}`.toUpperCase();
  const phoneOrEmail = user.telefono || user.email || "Cuenta BeGO protegida";

  const nameEl = document.getElementById("configUserName");
  const metaEl = document.getElementById("configUserMeta");
  const avatarEl = document.getElementById("configAvatar");

  if (nameEl) nameEl.textContent = nombre;
  if (metaEl) metaEl.textContent = phoneOrEmail;
  if (avatarEl) avatarEl.textContent = iniciales.slice(0, 2);
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
