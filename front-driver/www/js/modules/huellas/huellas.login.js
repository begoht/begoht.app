import {
  autenticarConHuella,
  dispositivoSoportaHuella,
  huellaActivada,
  registrarHuellaLocal,
  tokenGuardado
} from "./huellas.service.js";

document.addEventListener("DOMContentLoaded", async () => {
  const btnHuella = document.getElementById("btnHuella");
  if (!btnHuella) return;

  btnHuella.classList.add("visible");

  btnHuella.addEventListener("click", async () => {
    try {
      btnHuella.disabled = true;
      btnHuella.textContent = "Verificando...";

      if (!tokenGuardado()) {
        throw new Error("Primero inicia sesion una vez con tu telefono y contrasena");
      }

      if (!(await dispositivoSoportaHuella())) {
        throw new Error("Este celular no tiene huella disponible para esta app");
      }

      if (!huellaActivada()) {
        const activada = await registrarHuellaLocal();
        if (!activada) throw new Error("No se pudo activar la huella");
      }

      const ok = await autenticarConHuella();
      if (!ok) throw new Error("No se pudo validar la huella");

      window.location.href = "index.html";
    } catch (err) {
      console.error("Error huella:", err?.message || err);
      alert(err?.message || "No se pudo ingresar con huella");
    } finally {
      btnHuella.disabled = false;
      btnHuella.textContent = "Ingresar con huella";
    }
  });
});
