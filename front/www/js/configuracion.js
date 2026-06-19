import { getServerUrl } from "./conexion.js";
import { clearSessionTokens, getFreshAccessToken, getStoredAccessToken } from "./auth/session.js?v=20260606-session-refresh";

let activeAction = null;

const ACTIONS = {
  phone: {
    kicker: "Compte",
    title: "Changer le numero",
    copy: "Entrez votre nouveau telephone au format international et confirmez avec votre mot de passe actuel.",
    submit: "Mettre a jour",
    fields: `
      <label class="config-field">
        <span>Nouveau numero</span>
        <input id="configPhoneInput" type="tel" autocomplete="tel" inputmode="tel" placeholder="+50937123456">
      </label>
      <label class="config-field">
        <span>Mot de passe actuel</span>
        <input id="configPhonePassword" type="password" autocomplete="current-password" placeholder="Votre mot de passe">
      </label>
    `,
  },
  password: {
    kicker: "Securite",
    title: "Changer le mot de passe",
    copy: "Utilisez un mot de passe fort. Apres la mise a jour, vous devrez vous reconnecter.",
    submit: "Changer",
    fields: `
      <label class="config-field">
        <span>Mot de passe actuel</span>
        <input id="configCurrentPassword" type="password" autocomplete="current-password" placeholder="Mot de passe actuel">
      </label>
      <label class="config-field">
        <span>Nouveau mot de passe</span>
        <input id="configNewPassword" type="password" autocomplete="new-password" placeholder="Minimum 8 caracteres">
      </label>
      <label class="config-field">
        <span>Confirmer le mot de passe</span>
        <input id="configConfirmPassword" type="password" autocomplete="new-password" placeholder="Repetez le mot de passe">
      </label>
    `,
  },
};

export function initConfiguracion() {
  const darkToggle = document.getElementById("darkMode");
  const simpleToggle = document.getElementById("simpleMode");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");

  hydrateUser();
  initModal();
  bindActionButtons();

  if (darkToggle) {
    const darkSaved = localStorage.getItem("darkMode") === "true";
    document.body.classList.toggle("dark", darkSaved);
    darkToggle.checked = darkSaved;
    darkToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark", darkToggle.checked);
      localStorage.setItem("darkMode", darkToggle.checked ? "true" : "false");
      showToast(darkToggle.checked ? "Mode sombre active." : "Mode sombre desactive.", "success");
    });
  }

  if (simpleToggle) {
    const simpleSaved = localStorage.getItem("simpleMode") === "true";
    document.body.classList.toggle("simple-mode", simpleSaved);
    simpleToggle.checked = simpleSaved;
    simpleToggle.addEventListener("change", () => {
      document.body.classList.toggle("simple-mode", simpleToggle.checked);
      localStorage.setItem("simpleMode", simpleToggle.checked ? "true" : "false");
      showToast(simpleToggle.checked ? "Mode simple active." : "Mode simple desactive.", "success");
    });
  }

  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "1";
    logoutBtn.addEventListener("click", logout);
  }

  if (deleteAccountBtn && !deleteAccountBtn.dataset.bound) {
    deleteAccountBtn.dataset.bound = "1";
    deleteAccountBtn.addEventListener("click", deleteAccount);
  }
}

function initModal() {
  const modal = document.getElementById("configActionModal");
  const form = document.getElementById("configActionForm");

  document.querySelector("[data-config-modal-close]")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  form?.addEventListener("submit", submitAction);
}

function bindActionButtons() {
  document.querySelectorAll("[data-config-action]").forEach((button) => {
    if (button.dataset.configBound) return;
    button.dataset.configBound = "1";
    button.addEventListener("click", () => {
      const action = button.dataset.configAction;
      if (action === "location") {
        requestLocationPermission();
        return;
      }
      openModal(action);
    });
  });
}

function openModal(action) {
  const config = ACTIONS[action];
  if (!config) return;

  activeAction = action;
  setText("configActionKicker", config.kicker);
  setText("configActionTitle", config.title);
  setText("configActionCopy", config.copy);
  setText("configActionError", "");

  const fields = document.getElementById("configActionFields");
  if (fields) fields.innerHTML = config.fields;

  const submit = document.getElementById("configActionSubmit");
  if (submit) {
    submit.disabled = false;
    submit.querySelector("span").textContent = config.submit;
  }

  document.getElementById("configActionModal")?.classList.remove("hidden");

  if (action === "phone") {
    const user = getStoredUser();
    const input = document.getElementById("configPhoneInput");
    if (input) input.value = user.telefono || "";
    window.setTimeout(() => input?.focus(), 80);
  } else {
    window.setTimeout(() => document.getElementById("configCurrentPassword")?.focus(), 80);
  }
}

function closeModal() {
  activeAction = null;
  document.getElementById("configActionModal")?.classList.add("hidden");
}

async function submitAction(event) {
  event.preventDefault();
  setText("configActionError", "");

  try {
    setModalLoading(true);
    if (activeAction === "phone") {
      await submitPhoneChange();
    } else if (activeAction === "password") {
      await submitPasswordChange();
    }
  } catch (err) {
    setText("configActionError", err.message || "Operation impossible.");
  } finally {
    setModalLoading(false);
  }
}

async function submitPhoneChange() {
  const telefono = document.getElementById("configPhoneInput")?.value?.trim() || "";
  const password = document.getElementById("configPhonePassword")?.value || "";

  if (!/^\+\d{8,15}$/.test(telefono)) {
    throw new Error("Telephone invalide. Exemple: +50937123456");
  }

  if (!password) {
    throw new Error("Entrez votre mot de passe actuel.");
  }

  const data = await api("/api/users/phone", {
    method: "PATCH",
    body: { telefono, password },
  });

  if (data.user) {
    storeUser(data.user);
    hydrateUser();
  }

  closeModal();
  showToast(data.message || "Telephone mis a jour.", "success");
}

async function submitPasswordChange() {
  const currentPassword = document.getElementById("configCurrentPassword")?.value || "";
  const newPassword = document.getElementById("configNewPassword")?.value || "";
  const confirmPassword = document.getElementById("configConfirmPassword")?.value || "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new Error("Completez tous les champs.");
  }

  if (newPassword.length < 8) {
    throw new Error("Le nouveau mot de passe doit avoir au moins 8 caracteres.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Les mots de passe ne correspondent pas.");
  }

  const data = await api("/api/users/password", {
    method: "PATCH",
    body: { currentPassword, newPassword },
  });

  closeModal();
  showToast(data.message || "Mot de passe mis a jour. Reconnectez-vous.", "success", 1200);
  window.setTimeout(() => {
    clearSessionTokens();
    disconnectSocket();
    window.location.href = "registro.html";
  }, 1300);
}

async function requestLocationPermission() {
  if (!navigator.geolocation) {
    showToast("GPS non disponible sur cet appareil.", "error");
    return;
  }

  showToast("Demande d'autorisation GPS...", "success", 1800);

  try {
    const position = await getCurrentPosition();
    const payload = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    await api("/api/users/location", {
      method: "PATCH",
      body: payload,
    });

    localStorage.setItem("BeGO_location_permission", "granted");
    localStorage.setItem("BeGO_last_position", JSON.stringify({
      ...payload,
      accuracy: position.coords.accuracy || null,
      updatedAt: new Date().toISOString(),
    }));
    showToast("Position autorisee et actualisee.", "success");
  } catch (err) {
    localStorage.setItem("BeGO_location_permission", "denied");
    showToast(err.message || "Impossible d'obtenir la position.", "error");
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        const message = error?.code === 1
          ? "Autorisation GPS refusee."
          : error?.code === 2
            ? "Position indisponible."
            : "Temps d'attente GPS depasse.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  });
}

async function api(path, options = {}) {
  let token;
  try {
    token = await getFreshAccessToken(45);
  } catch {
    token = getStoredAccessToken();
  }

  if (!token) {
    throw new Error("Connectez-vous pour continuer.");
  }

  const response = await fetch(`${getServerUrl()}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearSessionTokens();
    }
    throw new Error(data.error || data.msg || "Operation impossible.");
  }

  return data;
}

async function logout() {
  const token = getStoredAccessToken();

  try {
    if (token) {
      await fetch(`${getServerUrl()}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {}

  clearSessionTokens();
  disconnectSocket();
  window.location.href = "registro.html";
}

async function deleteAccount() {
  const confirmation = window.prompt(
    "Cette action est definitive. Ecrivez ELIMINAR pour confirmer:"
  );
  if (String(confirmation || "").trim().toUpperCase() !== "ELIMINAR") return;

  const password = window.prompt("Entrez votre mot de passe actuel:");
  if (!password) return;

  try {
    const data = await api("/api/users/account", {
      method: "DELETE",
      body: { password, confirmation: "ELIMINAR" },
    });

    if (!data?.ok) throw new Error("Suppression impossible");
    clearSessionTokens();
    disconnectSocket();
    alert("Votre compte a ete supprime.");
    window.location.href = "registro.html";
  } catch (error) {
    showToast(error.message || "Suppression impossible.", "error");
  }
}

function disconnectSocket() {
  try {
    if (window.socket?.connected) window.socket.disconnect();
  } catch {}
}

function hydrateUser() {
  const user = getStoredUser();
  const nombre = [user.nombre, user.apellido].filter(Boolean).join(" ").trim() || "Invite";
  const iniciales = `${user.nombre?.[0] || "B"}${user.apellido?.[0] || ""}`.toUpperCase();
  const phoneOrEmail = user.telefono || user.email || "Compte BeGO protege";

  setText("configUserName", nombre);
  setText("configUserMeta", phoneOrEmail);

  const avatarEl = document.getElementById("configAvatar");
  if (avatarEl) avatarEl.textContent = iniciales.slice(0, 2);
}

function getStoredUser() {
  return safeJson(localStorage.getItem("BeGO_user"))
    || safeJson(localStorage.getItem("usuario"))
    || safeJson(localStorage.getItem("user"))
    || {};
}

function storeUser(user) {
  ["BeGO_user", "usuario", "user"].forEach((key) => {
    localStorage.setItem(key, JSON.stringify(user));
  });
  if (user.rol) localStorage.setItem("rol", user.rol);
}

function setModalLoading(isLoading) {
  const button = document.getElementById("configActionSubmit");
  if (!button) return;
  button.disabled = isLoading;
  const label = ACTIONS[activeAction]?.submit || "Confirmer";
  button.querySelector("span").textContent = isLoading ? "Traitement..." : label;
}

function showToast(message, type = "success", timeout = 2600) {
  const toast = document.getElementById("configToast");
  if (!toast) return;

  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.remove("hidden");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, timeout);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
