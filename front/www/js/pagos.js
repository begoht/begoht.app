import { getServerUrl } from "./conexion.js";

const PROVIDER_LABEL = {
  moncash: "MonCash",
  natcash: "NatCash",
};

let state = {
  providers: [],
  methods: [],
  selectedProvider: null,
  pendingDeleteId: null,
  saving: false,
};

export function initPago() {
  bindPaymentEvents();
  loadPaymentMethods();
}

function bindPaymentEvents() {
  document.querySelectorAll("[data-payment-link]").forEach((button) => {
    button.addEventListener("click", () => openPaymentModal(button.dataset.paymentLink));
  });

  document.querySelectorAll("[data-payment-default]").forEach((button) => {
    button.addEventListener("click", () => setDefaultProvider(button.dataset.paymentDefault));
  });

  document.querySelector("[data-payment-close]")?.addEventListener("click", closePaymentModal);
  document.getElementById("paymentModal")?.addEventListener("click", (event) => {
    if (event.target?.id === "paymentModal") closePaymentModal();
  });

  document.getElementById("paymentSubmit")?.addEventListener("click", savePaymentMethod);
}

async function loadPaymentMethods() {
  try {
    const data = await api("/api/payment-methods");
    state.providers = Array.isArray(data.providers) ? data.providers : [];
    state.methods = Array.isArray(data.methods) ? data.methods : [];
    renderPaymentState();
  } catch (err) {
    renderError(err.message || "Impossible de charger les paiements.");
  }
}

function renderPaymentState() {
  const linked = state.methods.filter((method) => method.status === "active");
  setText("paymentLinkedCount", `${linked.length} associe${linked.length === 1 ? "" : "s"}`);
  renderProviderCards();
  renderProviderStatus();
  renderMethodList();
}

function renderProviderCards() {
  ["moncash", "natcash"].forEach((provider) => {
    const method = state.methods.find((item) => item.provider === provider);
    const stateEl = document.getElementById(`paymentState${capitalize(provider)}`);
    const linkBtn = document.querySelector(`[data-payment-link="${provider}"] span`);
    const defaultBtn = document.querySelector(`[data-payment-default="${provider}"]`);

    if (method) {
      stateEl.innerHTML = `
        <strong>${escapeHtml(method.phoneMasked)}</strong>
        <span>${method.isDefault ? "Moyen par defaut" : "Compte associe"}</span>
      `;
      if (linkBtn) linkBtn.textContent = "Remplacer";
      if (defaultBtn) defaultBtn.disabled = method.isDefault;
    } else {
      stateEl.innerHTML = `
        <strong>Non associe</strong>
        <span>Ajoutez votre compte reel</span>
      `;
      if (linkBtn) linkBtn.textContent = "Associer";
      if (defaultBtn) defaultBtn.disabled = true;
    }
  });
}

function renderProviderStatus() {
  const target = document.getElementById("paymentProviderStatus");
  if (!target) return;

  target.innerHTML = state.providers.map((provider) => `
    <span class="${provider.canPay ? "ready" : "link-only"}">
      ${escapeHtml(provider.label)}: ${provider.canPay ? "Debit reel actif" : "Association seulement"}
    </span>
  `).join("");
}

function renderMethodList() {
  const list = document.getElementById("paymentMethodsList");
  if (!list) return;

  if (!state.methods.length) {
    list.innerHTML = `
      <div class="payment-empty">
        Aucun compte associe. Ajoutez MonCash ou NatCash pour preparer vos paiements.
      </div>
    `;
    return;
  }

  list.innerHTML = state.methods.map((method) => `
    <article class="payment-method-row">
      <div class="payment-method-icon ${method.provider}">
        <i class="fa-solid ${method.provider === "moncash" ? "fa-mobile-screen-button" : "fa-building-columns"}"></i>
      </div>
      <div class="payment-method-main">
        <strong>${escapeHtml(method.providerLabel)}</strong>
        <span>${escapeHtml(method.accountName || "Compte BeGO")} - ${escapeHtml(method.phoneMasked)}</span>
        <small>${method.canPay ? "Pret pour debit fournisseur" : "Associe, debit reel en attente fournisseur"}</small>
      </div>
      <div class="payment-method-actions">
        ${method.isDefault ? `<span class="payment-default-pill">Defaut</span>` : `<button type="button" data-method-default="${method.id}">Defaut</button>`}
        <button type="button" data-method-delete="${method.id}" aria-label="Supprimer ${escapeHtml(method.providerLabel)}">
          ${state.pendingDeleteId === method.id ? "OK" : `<i class="fa-solid fa-trash"></i>`}
        </button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-method-default]").forEach((button) => {
    button.addEventListener("click", () => setDefaultMethod(button.dataset.methodDefault));
  });

  list.querySelectorAll("[data-method-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteMethod(button.dataset.methodDelete));
  });
}

function openPaymentModal(provider) {
  state.selectedProvider = provider;
  const method = state.methods.find((item) => item.provider === provider);
  const label = PROVIDER_LABEL[provider] || "Mobile money";

  setText("paymentModalTitle", method ? `Remplacer ${label}` : `Associer ${label}`);
  setText("paymentModalKicker", label);
  setText("paymentModalCopy", `Entrez le numero ${label} haitien de 8 chiffres lie au compte.`);
  setValue("paymentAccountName", method?.accountName || "");
  setValue("paymentPhone", "");
  setChecked("paymentConfirmOwner", false);
  setText("paymentFormError", "");

  document.getElementById("paymentModal")?.classList.remove("hidden");
  window.setTimeout(() => document.getElementById("paymentPhone")?.focus(), 80);
}

function closePaymentModal() {
  document.getElementById("paymentModal")?.classList.add("hidden");
  state.selectedProvider = null;
}

async function savePaymentMethod() {
  if (state.saving) return;

  const provider = state.selectedProvider;
  const phone = document.getElementById("paymentPhone")?.value || "";
  const accountName = document.getElementById("paymentAccountName")?.value || "";
  const confirmed = document.getElementById("paymentConfirmOwner")?.checked;

  setText("paymentFormError", "");

  if (!provider) return;
  if (!confirmed) {
    setText("paymentFormError", "Confirmez que ce compte vous appartient.");
    return;
  }

  state.saving = true;
  setSubmitLoading(true);

  try {
    const data = await api("/api/payment-methods", {
      method: "POST",
      body: { provider, phone, accountName, makeDefault: true },
    });
    upsertMethod(data.method);
    closePaymentModal();
    renderPaymentState();
    showToast(`${PROVIDER_LABEL[provider]} associe avec succes.`, "success");
  } catch (err) {
    setText("paymentFormError", err.message || "Impossible d'associer ce compte.");
  } finally {
    state.saving = false;
    setSubmitLoading(false);
  }
}

async function setDefaultProvider(provider) {
  const method = state.methods.find((item) => item.provider === provider);
  if (method) await setDefaultMethod(method.id);
}

async function setDefaultMethod(id) {
  try {
    const data = await api(`/api/payment-methods/${encodeURIComponent(id)}/default`, {
      method: "PATCH",
    });
    upsertMethod(data.method);
    state.methods = state.methods.map((item) => ({
      ...item,
      isDefault: item.id === data.method.id,
    }));
    renderPaymentState();
    showToast("Moyen par defaut mis a jour.", "success");
  } catch (err) {
    showToast(err.message || "Mise a jour impossible.", "error");
  }
}

async function deleteMethod(id) {
  const method = state.methods.find((item) => item.id === id);
  if (!method) return;

  if (state.pendingDeleteId !== id) {
    state.pendingDeleteId = id;
    renderMethodList();
    showToast(`Touchez OK pour supprimer ${method.providerLabel}.`, "error");
    window.clearTimeout(deleteMethod.timer);
    deleteMethod.timer = window.setTimeout(() => {
      if (state.pendingDeleteId === id) {
        state.pendingDeleteId = null;
        renderMethodList();
      }
    }, 3200);
    return;
  }

  try {
    state.pendingDeleteId = null;
    await api(`/api/payment-methods/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.methods = state.methods.filter((item) => item.id !== id);
    await loadPaymentMethods();
    showToast("Compte supprime.", "success");
  } catch (err) {
    showToast(err.message || "Suppression impossible.", "error");
  }
}

function upsertMethod(method) {
  if (!method?.id) return;
  state.methods = state.methods.filter((item) => item.id !== method.id && item.provider !== method.provider);
  state.methods.unshift(method);
}

async function api(path, options = {}) {
  const token = localStorage.getItem("token") || localStorage.getItem("BeGO_token");
  if (!token) throw new Error("Connectez-vous pour gerer vos paiements.");

  const res = await fetch(`${getServerUrl()}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.msg || "Operation impossible.");
  }

  return data;
}

function renderError(message) {
  const list = document.getElementById("paymentMethodsList");
  if (list) list.innerHTML = `<div class="payment-empty error">${escapeHtml(message)}</div>`;
  showToast(message, "error");
}

function showToast(message, type = "success") {
  const toast = document.getElementById("paymentToast");
  if (!toast) return;

  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.remove("hidden");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function setSubmitLoading(isLoading) {
  const button = document.getElementById("paymentSubmit");
  if (!button) return;
  button.disabled = isLoading;
  button.querySelector("span").textContent = isLoading ? "Enregistrement..." : "Enregistrer";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function setChecked(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = checked;
}

function capitalize(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
