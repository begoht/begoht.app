let toastTimer = null;

export function showWalletToast(message, type = "info") {
  const toast = document.getElementById("walletToast");
  const text = String(message || "").trim();

  if (!toast || !text) return;

  window.clearTimeout(toastTimer);
  toast.textContent = text;
  toast.dataset.type = type;
  toast.classList.remove("hidden");

  toastTimer = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 3600);
}

export function setInlineError(id, message = "") {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = message;
  el.classList.toggle("oculto", !message);
}
