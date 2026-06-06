console.log("Registro motorista cargado");

document.addEventListener("DOMContentLoaded", () => {
  const btnRegistro = document.getElementById("btnRegistro");
  const msgRegistro = document.getElementById("msgRegistro");
  const telefonoInput = document.getElementById("telefono");
  const phoneOtpBox = document.getElementById("phoneOtpBox");
  const phoneOtpHint = document.getElementById("phoneOtpHint");
  const phoneOtpCode = document.getElementById("phoneOtpCode");
  const btnVerifyPhone = document.getElementById("btnVerifyPhone");
  const btnResendPhone = document.getElementById("btnResendPhone");
  let phoneVerificationToken = "";
  let phoneVerificationPhone = "";

  function normalizarTelefonoInternacional(value = "") {
    const clean = String(value || "").replace(/[\s().-]/g, "").trim();
    if (!clean.startsWith("+")) return "";
    return `+${clean.slice(1).replace(/\D/g, "")}`;
  }

  function telefonoInternacionalValido(value = "") {
    return /^\+\d{8,15}$/.test(normalizarTelefonoInternacional(value));
  }

  if (!btnRegistro) {
    console.log("No se encontro btnRegistro");
    return;
  }

  function resetPhoneVerification() {
    phoneVerificationToken = "";
    phoneVerificationPhone = "";
    if (phoneOtpCode) phoneOtpCode.value = "";
    if (phoneOtpBox) phoneOtpBox.hidden = true;
  }

  function getFormData() {
    return {
      nombre: document.getElementById("nombre")?.value.trim(),
      email: document.getElementById("email")?.value.trim(),
      telefono: telefonoInput?.value.trim(),
      password: document.getElementById("password")?.value.trim(),
      vehiculoMarca: document.getElementById("marca")?.value.trim(),
      vehiculoModelo: document.getElementById("modelo")?.value.trim(),
      placa: document.getElementById("placa")?.value.trim(),
    };
  }

  function validateForm(data) {
    if (!data.nombre || !data.email || !data.telefono || !data.password) {
      showMsg("Completa nombre, email, telefono y contrasena");
      return false;
    }

    if (!telefonoInternacionalValido(data.telefono)) {
      showMsg("Telefono invalido. Usa formato internacional, ejemplo +50937123456");
      return false;
    }

    if (data.password.length < 8) {
      showMsg("La contrasena debe tener minimo 8 caracteres");
      return false;
    }

    return true;
  }

  async function enviarCodigoTelefono() {
    const data = getFormData();
    if (!validateForm(data)) return;

    const telefono = normalizarTelefonoInternacional(data.telefono);
    btnRegistro.disabled = true;
    btnRegistro.innerText = "Enviando codigo...";
    showMsg("");

    try {
      const SERVER_URL = window.getServerUrl();
      const res = await fetch(`${SERVER_URL}/api/driver/auth/phone/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.msg || payload.error || "No se pudo enviar el codigo");
      }

      phoneOtpBox.hidden = false;
      phoneOtpHint.textContent = `Codigo enviado a ${payload.telefono || telefono}. Expira en 10 minutos.`;
      phoneOtpCode?.focus();
      showMsg("Ingresa el codigo enviado a tu celular", "ok");
    } catch (err) {
      showMsg(err.message || "Error enviando codigo");
    } finally {
      btnRegistro.disabled = false;
      btnRegistro.innerText = "Verificar y crear cuenta";
    }
  }

  async function crearCuentaVerificada() {
    const data = getFormData();
    if (!validateForm(data)) return;

    const telefonoNormalizado = normalizarTelefonoInternacional(data.telefono);
    if (!phoneVerificationToken || phoneVerificationPhone !== telefonoNormalizado) {
      await enviarCodigoTelefono();
      return;
    }

    try {
      btnRegistro.disabled = true;
      btnRegistro.innerText = "Registrando...";
      showMsg("");

      const SERVER_URL = window.getServerUrl();
      const res = await fetch(`${SERVER_URL}/api/driver/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: data.nombre,
          email: data.email,
          telefono: telefonoNormalizado,
          password: data.password,
          phoneVerificationToken,
          vehiculoMarca: data.vehiculoMarca,
          vehiculoModelo: data.vehiculoModelo,
          placa: data.placa
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.msg || "Error al registrar");
      }

      showMsg("Registro exitoso. Abriendo login...", "ok");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    } catch (err) {
      showMsg(err.message || "Error al registrar");
    } finally {
      btnRegistro.disabled = false;
      btnRegistro.innerText = "Verificar y crear cuenta";
    }
  }

  telefonoInput?.addEventListener("input", resetPhoneVerification);

  btnRegistro.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    const telefonoNormalizado = normalizarTelefonoInternacional(getFormData().telefono);
    if (phoneVerificationToken && phoneVerificationPhone === telefonoNormalizado) {
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
    const data = getFormData();
    if (!validateForm(data)) return;

    const telefonoNormalizado = normalizarTelefonoInternacional(data.telefono);
    const code = String(phoneOtpCode?.value || "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) {
      showMsg("Ingresa el codigo de 6 digitos");
      return;
    }

    btnVerifyPhone.disabled = true;
    btnVerifyPhone.innerText = "Verificando...";
    showMsg("");

    try {
      const SERVER_URL = window.getServerUrl();
      const res = await fetch(`${SERVER_URL}/api/driver/auth/phone/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: telefonoNormalizado, code }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.msg || payload.error || "Codigo invalido");
      }

      phoneVerificationToken = payload.phoneVerificationToken;
      phoneVerificationPhone = telefonoNormalizado;
      showMsg("Telefono verificado. Creando cuenta...", "ok");
      await crearCuentaVerificada();
    } catch (err) {
      showMsg(err.message || "Error verificando codigo");
    } finally {
      btnVerifyPhone.disabled = false;
      btnVerifyPhone.innerText = "Confirmar codigo";
    }
  });

  phoneOtpCode?.addEventListener("input", () => {
    phoneOtpCode.value = phoneOtpCode.value.replace(/\D/g, "").slice(0, 6);
  });

  btnRegistro.addEventListener("click", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const telefono = document.getElementById("telefono")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const vehiculoMarca = document.getElementById("marca")?.value.trim();
    const vehiculoModelo = document.getElementById("modelo")?.value.trim();
    const placa = document.getElementById("placa")?.value.trim();

    if (!nombre || !email || !telefono || !password) {
      showMsg("Completa nombre, email, telefono y contrasena");
      return;
    }

    if (!telefonoInternacionalValido(telefono)) {
      showMsg("Telefono invalido. Usa formato internacional, ejemplo +50937123456");
      return;
    }

    if (password.length < 8) {
      showMsg("La contrasena debe tener minimo 8 caracteres");
      return;
    }

    try {
      btnRegistro.disabled = true;
      btnRegistro.innerText = "Registrando...";
      showMsg("");

      const SERVER_URL = window.getServerUrl();
      console.log("SERVER_URL:", SERVER_URL);

      const res = await fetch(`${SERVER_URL}/api/driver/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre,
          email,
          telefono: normalizarTelefonoInternacional(telefono),
          password,
          vehiculoMarca,
          vehiculoModelo,
          placa
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.msg || "Error al registrar");
      }

      showMsg("Registro exitoso. Abriendo login...", "ok");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);

    } catch (err) {
      console.error("Error registro:", err.message);
      showMsg(err.message || "Error al registrar");
    } finally {
      btnRegistro.disabled = false;
      btnRegistro.innerText = "Crear cuenta";
    }
  });

  function showMsg(text, type = "error") {
    if (!msgRegistro) {
      if (text) alert(text);
      return;
    }

    msgRegistro.textContent = text;
    msgRegistro.className = text
      ? (type === "ok" ? "driver-msg ok" : "driver-msg error")
      : "driver-msg";
  }
});
