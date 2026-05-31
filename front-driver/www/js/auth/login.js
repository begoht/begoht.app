// js/auth/login.js

console.log("Login motorista cargado");

document.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btnLogin");
  const msgLogin = document.getElementById("msgLogin");

  if (!btnLogin) {
    console.log("No se encontro btnLogin");
    return;
  }

  btnLogin.addEventListener("click", async (e) => {
    e.preventDefault();

    const telefono = document.getElementById("telefono")?.value.trim();
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

      if (!data.token) {
        console.log("Respuesta login:", data);
        throw new Error("El servidor no devolvio token");
      }

      localStorage.setItem("token", data.token);
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
