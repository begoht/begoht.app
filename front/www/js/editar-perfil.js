import { getServerUrl } from "./conexion.js";

let token = localStorage.getItem("token") || "";
if (token.startsWith('"') && token.endsWith('"')) token = token.slice(1, -1);
if (!token) window.location.replace("registro.html");

const inputFoto = document.getElementById("inputFoto");
const previewFoto = document.getElementById("previewFoto");
const btnCambiarFoto = document.getElementById("btnCambiarFoto");
const nombreInput = document.getElementById("nombre");
const emailInput = document.getElementById("email");
const guardarBtn = document.getElementById("guardarPerfil");

const user = JSON.parse(localStorage.getItem("BeGO_user")) || {};
nombreInput.value = user.nombre || "";
emailInput.value = user.email || "";
if (user.foto) previewFoto.src = user.foto;

const API_URL = `${getServerUrl()}/api`;

btnCambiarFoto.addEventListener("click", () => inputFoto.click());
inputFoto.addEventListener("change", () => {
  const file = inputFoto.files[0];
  if (!file) return;
  previewFoto.src = URL.createObjectURL(file);
});

guardarBtn.addEventListener("click", async () => {
  if (!nombreInput.value || !emailInput.value) {
    alert("Completa todos los campos");
    return;
  }

  guardarBtn.disabled = true;
  guardarBtn.textContent = "Guardando...";

  try {
    const formData = new FormData();
    formData.append("nombre", nombreInput.value.trim());
    formData.append("email", emailInput.value.trim());
    if (inputFoto.files[0]) formData.append("foto", inputFoto.files[0]);

    const res = await fetch(`${API_URL}/users/profile`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.msg || "Error al actualizar perfil");
    }

    const updatedUser = await res.json();
    ["BeGO_user", "usuario", "user"].forEach((key) => {
      localStorage.setItem(key, JSON.stringify(updatedUser));
    });
    window.dispatchEvent(new CustomEvent("bego:profile-updated", { detail: updatedUser }));

    alert("✅ Perfil actualizado correctamente");
    history.back();
  } catch (err) {
    console.error(err);
    alert("❌ No se pudo actualizar perfil\n" + err.message);
  } finally {
    guardarBtn.disabled = false;
    guardarBtn.textContent = "Guardar cambios";
  }
});
