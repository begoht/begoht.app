console.log("🔥 Registro motorista cargado");

document.addEventListener("DOMContentLoaded", () => {

  const btnRegistro = document.getElementById("btnRegistro");

  if (!btnRegistro) {
    console.log("❌ No se encontró btnRegistro");
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
      alert("⚠️ Faltan datos obligatorios");
      return;
    }

    try {

      btnRegistro.disabled = true;
      btnRegistro.innerText = "Registrando...";

      // ✅ Obtener URL correctamente
      const SERVER_URL = window.getServerUrl();
      console.log("🌍 SERVER_URL:", SERVER_URL);

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

      alert("✅ Registro exitoso");

      window.location.href = "login.html";

    } catch (err) {

      console.error("❌ Error registro:", err.message);
      alert("❌ " + err.message);

    } finally {

      btnRegistro.disabled = false;
      btnRegistro.innerText = "Crear Cuenta";
    }

  });

});
