import { getServerUrl } from "./conexion.js";
import { ofrecerActivacionHuella } from "./modules/huellas/huellas.service.js?v=20260601-huella-user";

document.addEventListener("DOMContentLoaded", () => {

  const SERVER_URL = getServerUrl();

  // =============================
  // ELEMENTOS GENERALES
  // =============================

  const registroBox = document.querySelector(".registro");
  const loginBox = document.querySelector(".login");
  const authPage = document.querySelector(".auth-page");
  const tabLogin = document.querySelector(".tab-login");
  const tabRegister = document.querySelector(".tab-register");

  const irLogin = document.getElementById("irLogin");
  const irRegistro = document.getElementById("irRegistro");

  // =============================
  // REGISTRO SLIDER 2 PASOS
  // =============================

  const slider = document.querySelector(".register-slider");

  const btnNext = document.getElementById("btnNext");
  const btnBack = document.getElementById("btnBack");
  const volverLogin = document.getElementById("volverLogin");

  const nombre = document.getElementById("nombre");
  const apellido = document.getElementById("apellido");
  const telefono = document.getElementById("telefono");
  const email = document.getElementById("email");
  const rol = document.getElementById("rol");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const terminos = document.getElementById("terminos");

  const btnRegistro = document.getElementById("btnRegistro");
  const msgRegistro = document.getElementById("msgRegistro");

  // =============================
  // LOGIN ELEMENTOS
  // =============================

  const btnLogin = document.getElementById("btnLogin");
  const loginTelefono = document.getElementById("loginTelefono");
  const loginPassword = document.getElementById("loginPassword");
  const msgLogin = document.getElementById("msgLogin");
  setAuthMode("login");

  // =============================
  // UTILIDADES MENSAJES
  // =============================

  function limpiarMsg(elemento) {
    if (!elemento) return;
    elemento.textContent = "";
    elemento.className = "msg";
  }

  function mostrarMsg(elemento, texto, tipo = "error") {
    if (!elemento) return;
    elemento.textContent = texto;
    elemento.className = tipo === "ok" ? "msg ok" : "msg error";
  }

  // =============================
  // CAMBIO ENTRE LOGIN / REGISTRO
  // =============================

  function setAuthMode(mode) {
    authPage?.setAttribute("data-mode", mode);
  }

  function showRegistro() {
    loginBox?.classList.remove("active");
    registroBox?.classList.add("active");
    slider.style.transform = "translateX(0%)";
    setAuthMode("registro");
    limpiarMsg(msgRegistro);
  }

  function showLogin() {
    registroBox?.classList.remove("active");
    loginBox?.classList.add("active");
    slider.style.transform = "translateX(0%)";
    setAuthMode("login");
    limpiarMsg(msgRegistro);
    limpiarMsg(msgLogin);
  }

  irRegistro?.addEventListener("click", showRegistro);
  tabRegister?.addEventListener("click", showRegistro);

  irLogin?.addEventListener("click", showLogin);
  tabLogin?.addEventListener("click", showLogin);

  volverLogin?.addEventListener("click", () => {
    showLogin();
  });

  // =============================
  // PASO 1 → PASO 2
  // =============================

  btnNext?.addEventListener("click", () => {

    limpiarMsg(msgRegistro);

    if (!nombre.value.trim() || !apellido.value.trim() || !telefono.value.trim()) {
      mostrarMsg(msgRegistro, "Completa nombre, apellido y teléfono");
      return;
    }

    if (!/^[0-9]{8,15}$/.test(telefono.value.trim())) {
      mostrarMsg(msgRegistro, "Teléfono inválido");
      return;
    }

    if (email.value.trim() && !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
      mostrarMsg(msgRegistro, "Email inválido");
      return;
    }

    slider.style.transform = "translateX(-50%)";
  });

  // =============================
  // VOLVER A PASO 1
  // =============================

  btnBack?.addEventListener("click", () => {
    slider.style.transform = "translateX(0%)";
    limpiarMsg(msgRegistro);
  });

  // =============================
  // REGISTRO FINAL
  // =============================

  btnRegistro?.addEventListener("click", async () => {

    limpiarMsg(msgRegistro);

    if (!password.value || password.value.length < 8) {
      mostrarMsg(msgRegistro, "La contraseña debe tener mínimo 8 caracteres");
      return;
    }

    if (password.value !== confirmPassword.value) {
      mostrarMsg(msgRegistro, "Las contraseñas no coinciden");
      return;
    }

    if (!terminos.checked) {
      mostrarMsg(msgRegistro, "Debes aceptar los términos");
      return;
    }

    const usuario = {
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      telefono: telefono.value.trim(),
      email: email.value.trim().toLowerCase() || null,
      password: password.value.trim(),
      rol: rol.value
    };

    btnRegistro.disabled = true;
    btnRegistro.textContent = "Creando cuenta...";

    try {

      const res = await fetch(`${SERVER_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usuario),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.msg || "Error en registro");
      }

      mostrarMsg(msgRegistro, "Cuenta creada correctamente ✅", "ok");

      setTimeout(() => {
        registroBox?.classList.remove("active");
        loginBox?.classList.add("active");
        slider.style.transform = "translateX(0%)";
        limpiarMsg(msgRegistro);
      }, 1200);

    } catch (err) {
      mostrarMsg(msgRegistro, err.message || "Error de conexión");
    } finally {
      btnRegistro.disabled = false;
      btnRegistro.textContent = "Crear Cuenta";
    }

  });

  // =============================
  // LOGIN
  // =============================

  btnLogin?.addEventListener("click", async () => {

    limpiarMsg(msgLogin);

    const datos = {
      identificador: loginTelefono?.value.trim(),
      password: loginPassword?.value.trim(),
    };

    if (!datos.identificador || !datos.password) {
      mostrarMsg(msgLogin, "Completa todos los campos");
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Ingresando...";

    try {

      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.msg || "Credenciales inválidas");
      }

      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("BeGO_token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("BeGO_refreshToken", data.refreshToken);
      localStorage.setItem("rol", data.user.rol);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("usuario", JSON.stringify(data.user));
      localStorage.setItem("BeGO_user", JSON.stringify(data.user));

      await ofrecerActivacionHuella();

      mostrarMsg(msgLogin, "Bienvenido 🚀", "ok");

      setTimeout(() => {
        if (data.user.rol === "admin") {
          window.location.href = "paginas/admin-dashboard.html";
        } else if (data.user.rol === "motorista") {
          window.location.href = getDriverUrl();
        } else {
          window.location.href = "index.html";
        }
      }, 1000);

    } catch (err) {
      mostrarMsg(msgLogin, err.message || "Error de conexión");
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = "Ingresar";
    }

  });

  // =============================
  // ENTER EN LOGIN
  // =============================

  loginPassword?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      btnLogin?.click();
    }
  });

  function getDriverUrl() {
    if (window.location.pathname.includes("/front/www/")) {
      return "../../front-driver/www/index.html";
    }

    return "/driver/index.html";
  }

});
