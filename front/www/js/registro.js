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
  const phoneOtpBox = document.getElementById("phoneOtpBox");
  const phoneOtpHint = document.getElementById("phoneOtpHint");
  const phoneOtpCode = document.getElementById("phoneOtpCode");
  const btnVerifyPhone = document.getElementById("btnVerifyPhone");
  const btnResendPhone = document.getElementById("btnResendPhone");
  let phoneVerificationToken = "";
  let phoneVerificationPhone = "";

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

  function normalizarTelefonoInternacional(value = "") {
    const clean = String(value || "").replace(/[\s().-]/g, "").trim();
    if (!clean.startsWith("+")) return "";
    return `+${clean.slice(1).replace(/\D/g, "")}`;
  }

  function telefonoInternacionalValido(value = "") {
    return /^\+\d{8,15}$/.test(normalizarTelefonoInternacional(value));
  }

  function resetPhoneVerification() {
    phoneVerificationToken = "";
    phoneVerificationPhone = "";
    if (phoneOtpCode) phoneOtpCode.value = "";
    if (phoneOtpBox) phoneOtpBox.hidden = true;
  }

  function registroTelefonoActual() {
    return normalizarTelefonoInternacional(telefono.value);
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

    if (!nombre.value.trim() || !apellido.value.trim() || !telefono.value.trim() || !email.value.trim()) {
      mostrarMsg(msgRegistro, "Completa nombre, apellido y teléfono");
      return;
    }

    if (!telefonoInternacionalValido(telefono.value)) {
      mostrarMsg(msgRegistro, "Telefono invalido. Usa formato internacional, ejemplo +50937123456");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
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

  telefono?.addEventListener("input", resetPhoneVerification);
  email?.addEventListener("input", resetPhoneVerification);

  // =============================
  // REGISTRO FINAL + OTP
  // =============================

  function validarSeguridadRegistro() {
    if (!password.value || password.value.length < 8) {
      mostrarMsg(msgRegistro, "La contrasena debe tener minimo 8 caracteres");
      return false;
    }

    if (password.value !== confirmPassword.value) {
      mostrarMsg(msgRegistro, "Las contrasenas no coinciden");
      return false;
    }

    if (!terminos.checked) {
      mostrarMsg(msgRegistro, "Debes aceptar los terminos");
      return false;
    }

    return true;
  }

  async function enviarCodigoTelefono() {
    limpiarMsg(msgRegistro);

    const emailValue = email.value.trim().toLowerCase();
    if (!emailValue || !/^\S+@\S+\.\S+$/.test(emailValue)) {
      mostrarMsg(msgRegistro, "Email invalido");
      return;
    }

    btnRegistro.disabled = true;
    btnRegistro.textContent = "Enviando codigo...";

    try {
      const res = await fetch(`${SERVER_URL}/api/auth/email/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.msg || data?.error || "No se pudo enviar el codigo");
      }

      phoneOtpBox.hidden = false;
      phoneOtpHint.textContent = `Codigo enviado a ${data?.email || emailValue}. Expira en 10 minutos.`;
      phoneOtpCode?.focus();
      mostrarMsg(msgRegistro, "Ingresa el codigo enviado a tu correo", "ok");
    } catch (err) {
      mostrarMsg(msgRegistro, err.message || "Error enviando codigo");
    } finally {
      btnRegistro.disabled = false;
      btnRegistro.textContent = "Verificar y crear cuenta";
    }
  }

  async function crearCuentaVerificada() {
    const usuario = {
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      telefono: registroTelefonoActual(),
      email: email.value.trim().toLowerCase() || null,
      password: password.value.trim(),
      rol: rol.value,
      emailVerificationToken: phoneVerificationToken,
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
        throw new Error(data?.error || data?.msg || "Error en registro");
      }

      mostrarMsg(msgRegistro, "Cuenta creada correctamente", "ok");

      setTimeout(() => {
        registroBox?.classList.remove("active");
        loginBox?.classList.add("active");
        slider.style.transform = "translateX(0%)";
        resetPhoneVerification();
        limpiarMsg(msgRegistro);
      }, 1200);
    } catch (err) {
      mostrarMsg(msgRegistro, err.message || "Error de conexion");
    } finally {
      btnRegistro.disabled = false;
      btnRegistro.textContent = "Verificar y crear cuenta";
    }
  }

  btnRegistro?.addEventListener("click", async (event) => {
    event.stopImmediatePropagation();
    limpiarMsg(msgRegistro);
    if (!validarSeguridadRegistro()) return;

    const emailValue = email.value.trim().toLowerCase();
    if (phoneVerificationToken && phoneVerificationPhone === emailValue) {
      await crearCuentaVerificada();
      return;
    }

    await enviarCodigoTelefono();
  });

  btnResendPhone?.addEventListener("click", async () => {
    phoneVerificationToken = "";
    phoneVerificationPhone = "";
    await enviarCodigoTelefono();
  });

  btnVerifyPhone?.addEventListener("click", async () => {
    limpiarMsg(msgRegistro);
    if (!validarSeguridadRegistro()) return;

    const emailValue = email.value.trim().toLowerCase();
    const code = String(phoneOtpCode?.value || "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) {
      mostrarMsg(msgRegistro, "Ingresa el codigo de 6 digitos");
      return;
    }

    btnVerifyPhone.disabled = true;
    btnVerifyPhone.textContent = "Verificando...";

    try {
      const res = await fetch(`${SERVER_URL}/api/auth/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, code }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.msg || data?.error || "Codigo invalido");
      }

      phoneVerificationToken = data.emailVerificationToken;
      phoneVerificationPhone = emailValue;
      mostrarMsg(msgRegistro, "Email verificado. Creando cuenta...", "ok");
      await crearCuentaVerificada();
    } catch (err) {
      mostrarMsg(msgRegistro, err.message || "Error verificando codigo");
    } finally {
      btnVerifyPhone.disabled = false;
      btnVerifyPhone.textContent = "Confirmar codigo";
    }
  });

  phoneOtpCode?.addEventListener("input", () => {
    phoneOtpCode.value = phoneOtpCode.value.replace(/\D/g, "").slice(0, 6);
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
      telefono: normalizarTelefonoInternacional(telefono.value),
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
        throw new Error(data?.error || data?.msg || "Error en registro");
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
      identificador: loginTelefono?.value.trim().startsWith("+")
        ? normalizarTelefonoInternacional(loginTelefono.value)
        : loginTelefono?.value.trim(),
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
