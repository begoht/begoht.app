import { getToken, getServerUrl } from "./wallet-config.js?v=20260605-wallet-secure";
import { setInlineError, showWalletToast } from "./wallet-feedback.js?v=20260605-wallet-secure";

export function abrirConfigPin() {
  document.getElementById("modalPin")?.classList.remove("hidden");
  document.getElementById("nuevoPin")?.focus();
}

export function cerrarPin() {
  document.getElementById("modalPin")?.classList.add("hidden");
  setInlineError("pinConfigError");
}

export function abrirCambiarPin() {
  document.getElementById("modalCambiarPin")?.classList.remove("hidden");
  document.getElementById("pinActual")?.focus();
}

export function cerrarCambiarPin() {
  document.getElementById("modalCambiarPin")?.classList.add("hidden");
  setInlineError("pinCambioError");
}

export async function guardarPin() {
  const pinInput = document.getElementById("nuevoPin");
  const pin = pinInput?.value.trim() || "";

  setInlineError("pinConfigError");

  if (pinInseguro(pin)) {
    setInlineError("pinConfigError", "Choisissez un PIN de 4 chiffres plus difficile.");
    return;
  }

  try {
    const data = await postPin("/api/wallet/configurar-pin", { pin });
    if (!data.ok) throw new Error(data.error || "PIN non configure");

    pinInput.value = "";
    cerrarPin();
    showWalletToast("PIN configure correctement.", "success");
    document.getElementById("walletPinStatus").textContent = "PIN actif";
    document.getElementById("walletSecureState").textContent = "Protegee";
  } catch (error) {
    setInlineError("pinConfigError", error.message);
  }
}

export async function cambiarPin() {
  const actualInput = document.getElementById("pinActual");
  const nuevoInput = document.getElementById("nuevoPinCambio");
  const pinActual = actualInput?.value.trim() || "";
  const nuevoPin = nuevoInput?.value.trim() || "";

  setInlineError("pinCambioError");

  if (!/^\d{4}$/.test(pinActual)) {
    setInlineError("pinCambioError", "Entrez votre PIN actuel.");
    return;
  }

  if (pinInseguro(nuevoPin)) {
    setInlineError("pinCambioError", "Choisissez un nouveau PIN plus difficile.");
    return;
  }

  try {
    const data = await postPin("/api/wallet/cambiar-pin", { pinActual, nuevoPin });
    if (!data.ok) throw new Error(data.error || "PIN non mis a jour");

    actualInput.value = "";
    nuevoInput.value = "";
    cerrarCambiarPin();
    showWalletToast("PIN mis a jour.", "success");
  } catch (error) {
    setInlineError("pinCambioError", error.message);
  }
}

function pinInseguro(pin) {
  return !/^\d{4}$/.test(pin) ||
    ["0000", "1111", "1234", "4321", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"].includes(pin);
}

async function postPin(path, body) {
  const res = await fetch(`${getServerUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data.error || data.msg || "Operation impossible");
  }

  return data;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
