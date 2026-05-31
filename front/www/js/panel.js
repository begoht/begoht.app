/*************************************************
 * 📌 ELEMENTOS
 *************************************************/
const configPanel = document.getElementById("configPanel");

/*************************************************
 * 📂 ABRIR PANEL
 * (llamar desde botón de usuario)
 *************************************************/
function abrirConfig() {
  configPanel.classList.remove("hidden");
  setTimeout(() => {
    configPanel.classList.add("show");
  }, 10);
}

/*************************************************
 * ❌ CERRAR PANEL
 *************************************************/
function cerrarConfig() {
  configPanel.classList.remove("show");
  setTimeout(() => {
    configPanel.classList.add("hidden");
  }, 300);
}

/*************************************************
 * 🌙 MODO OSCURO (PERSISTENTE)
 *************************************************/
function toggleDarkMode(checkbox) {
  const isDark = checkbox.checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("BeGO_dark_mode", isDark ? "1" : "0");
}

/*************************************************
 * 🔄 CARGAR PREFERENCIAS
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // 🌙 Dark mode
  const darkMode = localStorage.getItem("BeGO_dark_mode") === "1";
  document.body.classList.toggle("dark", darkMode);

  const darkToggle = document.querySelector(
    ".config-list input[type='checkbox'][onchange]"
  );
  if (darkToggle) darkToggle.checked = darkMode;

  // 📱 Cerrar panel al cambiar de página (mobile UX)
  document.querySelectorAll(".config-list li").forEach((item) => {
    item.addEventListener("click", () => {
      cerrarConfig();
    });
  });
});

/*************************************************
 * 🔐 CERRAR SESIÓN
 *************************************************/
function cerrarSesion() {
  if (!confirm("¿Deseas cerrar sesión?")) return;

  localStorage.removeItem("token");
  localStorage.removeItem("BeGO_user");

  // Limpieza extra (opcional)
  localStorage.removeItem("BeGO_dark_mode");

  window.location.replace("registro.html");
}

/*************************************************
 * 📱 CERRAR PANEL TOCANDO FUERA
 *************************************************/
document.addEventListener("click", (e) => {
  if (
    configPanel.classList.contains("show") &&
    !configPanel.contains(e.target) &&
    !e.target.closest(".icon-btn")
  ) {
    cerrarConfig();
  }
});

/*************************************************
 * ⬅️ BOTÓN BACK (ANDROID)
 *************************************************/
if (window.Capacitor) {
  document.addEventListener("backbutton", () => {
    if (configPanel.classList.contains("show")) {
      cerrarConfig();
    }
  });
}
