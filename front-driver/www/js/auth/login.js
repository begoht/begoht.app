// js/auth/login.js

console.log("Login motorista cargado");

document.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btnLogin");
  const msgLogin = document.getElementById("msgLogin");
  const btnForgotPassword = document.getElementById("btnForgotPassword");
  const passwordResetBox = document.getElementById("passwordResetBox");
  const resetEmail = document.getElementById("resetEmail");
  const resetCode = document.getElementById("resetCode");
  const resetPassword = document.getElementById("resetPassword");
  const btnSendResetCode = document.getElementById("btnSendResetCode");
  const btnResetPassword = document.getElementById("btnResetPassword");

  function normalizarTelefonoInternacional(value = "") {
    const clean = String(value || "").replace(/[\s().-]/g, "").trim();
    if (!clean.startsWith("+")) return String(value || "").trim();
    return `+${clean.slice(1).replace(/\D/g, "")}`;
  }

  if (!btnLogin) {
    console.log("No se encontro btnLogin");
    return;
  }

  btnLogin.addEventListener("click", async (e) => {
    e.preventDefault();

    const telefono = normalizarTelefonoInternacional(document.getElementById("telefono")?.value);
    const password = document.getElementById("password")?.value.trim();

    if (!telefono || !password) {
      showMsg("Completa telefono y contrasena");
      return;
    }

    try {
      btnLogin.disabled = true;
      btnLogin.innerText = "Ingresando...";
      showMsg("");

      const SERVER_URL = window.getServerUrl();
      console.log("SERVER_URL:", SERVER_URL);

      const res = await fetch(`${SERVER_URL}/api/driver/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ telefono, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.msg || "Error al iniciar sesion");
      }

      const accessToken = data.accessToken || data.token;

      if (!accessToken) {
        console.log("Respuesta login:", data);
        throw new Error("El servidor no devolvio token");
      }

      localStorage.setItem("token", accessToken);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("BeGO_driver_refreshToken", data.refreshToken);
      }
      if (data.user) {
        localStorage.setItem("motorista", JSON.stringify(data.user));
      }
      localStorage.setItem("rol", "motorista");

      console.log("Login exitoso");

      try {
        const huellas = await import("../modules/huellas/huellas.service.js");
        await huellas.ofrecerActivacionHuella();
      } catch (huellaErr) {
        console.warn("Huella no disponible:", huellaErr?.message || huellaErr);
      }

      showMsg("Sesion iniciada. Preparando tu panel...", "ok");
      window.location.href = "index.html";

    } catch (err) {
      console.error("Error login:", err.message);
      showMsg(err.message || "Error al iniciar sesion");
    } finally {
      btnLogin.disabled = false;
      btnLogin.innerText = "Ingresar";
    }
  });

  btnForgotPassword?.addEventListener("click", () => {
    passwordResetBox.hidden = !passwordResetBox.hidden;
    if (!passwordResetBox.hidden) resetEmail?.focus();
  });

  resetCode?.addEventListener("input", () => {
    resetCode.value = resetCode.value.replace(/\D/g, "").slice(0, 6);
  });

  btnSendResetCode?.addEventListener("click", () => passwordResetRequest(
    "/api/driver/auth/password/forgot",
    { email: resetEmail?.value.trim().toLowerCase() },
    btnSendResetCode,
    "Codigo enviado. Revisa tu email."
  ));

  btnResetPassword?.addEventListener("click", async () => {
    const data = await passwordResetRequest(
      "/api/driver/auth/password/reset",
      {
        email: resetEmail?.value.trim().toLowerCase(),
        code: resetCode?.value,
        newPassword: resetPassword?.value,
      },
      btnResetPassword,
      "Contrasena actualizada. Ya puedes iniciar sesion."
    );
    if (data?.ok) passwordResetBox.hidden = true;
  });

  async function passwordResetRequest(path, payload, button, successMessage) {
    button.disabled = true;
    showMsg("");
    try {
      const response = await fetch(`${window.getServerUrl()}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.msg || data.error || "Operation impossible");
      showMsg(successMessage, "ok");
      return data;
    } catch (error) {
      showMsg(error.message || "Operation impossible");
      return null;
    } finally {
      button.disabled = false;
    }
  }

  function showMsg(text, type = "error") {
    if (!msgLogin) {
      if (text) alert(text);
      return;
    }

    msgLogin.textContent = text;
    msgLogin.className = text
      ? (type === "ok" ? "driver-msg ok" : "driver-msg error")
      : "driver-msg";
  }
});
