export function initUserUI() {
  const user = safeJson(localStorage.getItem("BeGO_user")) || safeJson(localStorage.getItem("usuario"));
  if (!user || !user.nombre) return;

  const nombre = formatDisplayName(user);

  document.querySelectorAll("#nombreUsuario, #nombreCuentaUsuario").forEach((el) => {
    el.textContent = nombre;
  });

  const saludoIndex = document.getElementById("saludoUsuario");
  if (saludoIndex) saludoIndex.textContent = `Hola ${nombre}`;

  const aliasEl = document.getElementById("aliasCuentaUsuario");
  if (aliasEl) aliasEl.textContent = user.alias ? `@${user.alias}` : "Perfil BeGO";

  const initialsEl = document.getElementById("cuentaIniciales");
  if (initialsEl) initialsEl.textContent = getInitials(user);
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function formatDisplayName(user) {
  const firstName = String(user?.nombre || "Invitado").trim().split(/\s+/)[0] || "Invitado";
  const lastName = String(user?.apellido || "").trim().split(/\s+/)[0];
  const fallbackLastName = String(user?.nombre || "")
    .trim()
    .split(/\s+/)
    .slice(1)
    .join(" ");
  const initial = (lastName || fallbackLastName).trim()[0];

  return initial ? `${firstName} ${initial.toUpperCase()}.` : firstName;
}

function getInitials(user) {
  const nameParts = [user?.nombre, user?.apellido]
    .filter(Boolean)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return nameParts.slice(0, 2).map(part => part[0]).join("").toUpperCase() || "B";
}
