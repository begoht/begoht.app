import { getServerUrl } from "./conexion.js";

const role = document.getElementById("deleteRole");
const identifier = document.getElementById("deleteIdentifier");
const password = document.getElementById("deletePassword");
const confirmBox = document.getElementById("deleteConfirm");
const submit = document.getElementById("deleteAccountSubmit");
const message = document.getElementById("deleteAccountMessage");

submit?.addEventListener("click", async () => {
  setMessage("");

  if (!identifier.value.trim() || !password.value || !confirmBox.checked) {
    setMessage("Completez les champs et confirmez l'action.");
    return;
  }

  submit.disabled = true;
  try {
    const token = await login();
    const response = await fetch(`${getServerUrl()}/api/users/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: password.value,
        confirmation: "ELIMINAR",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Suppression impossible");
    }

    setMessage("Votre compte a ete supprime.", "ok");
    password.value = "";
    identifier.value = "";
    confirmBox.checked = false;
  } catch (error) {
    setMessage(error.message || "Suppression impossible");
  } finally {
    submit.disabled = false;
  }
});

async function login() {
  const isDriver = role.value === "motorista";
  const path = isDriver ? "/api/driver/auth/login" : "/api/auth/login";
  const body = isDriver
    ? { telefono: identifier.value.trim(), password: password.value }
    : { identificador: identifier.value.trim(), password: password.value };

  const response = await fetch(`${getServerUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.error || "Identifiants invalides");
  const token = data.accessToken || data.token;
  if (!token) throw new Error("Session invalide");
  return token;
}

function setMessage(text, type = "error") {
  message.textContent = text;
  message.className = text ? `msg ${type}` : "msg";
}
