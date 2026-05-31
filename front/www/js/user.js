export function initUserUI() {
  const user = safeJson(localStorage.getItem("BeGO_user")) || safeJson(localStorage.getItem("usuario"));
  if (!user || !user.nombre) return;

  const nombre = user.nombre.split(" ")[0];

  document.querySelectorAll("#nombreUsuario, #nombreCuentaUsuario").forEach((el) => {
    el.textContent = nombre;
  });

  const saludoIndex = document.getElementById("saludoUsuario");
  if (saludoIndex) saludoIndex.textContent = `Hola ${nombre}`;
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
