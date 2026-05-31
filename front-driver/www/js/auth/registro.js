console.log("Registro motorista cargado");

document.addEventListener("DOMContentLoaded", () => {
  const btnRegistro = document.getElementById("btnRegistro");
  const msgRegistro = document.getElementById("msgRegistro");

  if (!btnRegistro) {
    console.log("No se encontro btnRegistro");
    return;
  }

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
          telefono,
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
