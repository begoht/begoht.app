import {
  buscarDestinatarioWallet,
  enviarWallet,
  obtenerMovimientos,
  obtenerWallet,
} from "./wallet-service.js?v=20260605-wallet-secure";
import { actualizarSaldo, renderHistorial } from "./wallet-ui.js?v=20260605-wallet-secure";
import { getCurrentUser } from "./wallet-config.js?v=20260605-wallet-secure";
import { abrirConfigPin } from "./wallet-pin.js?v=20260605-wallet-secure";
import { setInlineError, showWalletToast } from "./wallet-feedback.js?v=20260605-wallet-secure";

let destinatarioActual = null;
let transferenciaEnCurso = false;

export async function mostrarRecarga() {
  location.hash = "#/recarga";
}

export async function abrirEnviar() {
  try {
    const wallet = await obtenerWallet();
    if (wallet.tienePin === false) {
      showWalletToast("Configurez votre PIN avant d'envoyer de l'argent.", "error");
      abrirConfigPin();
      return;
    }

    document.getElementById("modalSelectSendType")?.classList.add("active");
  } catch (error) {
    showWalletToast(error.message || "Wallet indisponible.", "error");
  }
}

export function cerrarModalSend() {
  document.getElementById("modalSelectSendType")?.classList.remove("active");
}

export function mostrarBusqueda(tipo) {
  cerrarModalSend();

  const modal = document.getElementById("modalBuscarDestinatario");
  const titulo = document.getElementById("buscarTitulo");
  const copy = document.getElementById("buscarCopy");
  const input = document.getElementById("inputBusqueda");

  if (!modal || !input) return;

  input.value = "";
  modal.dataset.tipoBusqueda = tipo;

  if (tipo === "telefono") {
    if (titulo) titulo.textContent = "Numero de telephone";
    if (copy) copy.textContent = "Entrez le numero exact lie au compte BeGO.";
    input.placeholder = "ex: +509...";
    input.inputMode = "tel";
  } else {
    if (titulo) titulo.textContent = "Alias BeGO";
    if (copy) copy.textContent = "Entrez l'alias public du destinataire.";
    input.placeholder = "ex: bego1234";
    input.inputMode = "text";
  }

  modal.classList.remove("hidden");
  input.focus();
}

export function cerrarBusqueda() {
  document.getElementById("modalBuscarDestinatario")?.classList.add("hidden");
}

export async function procesarBusqueda() {
  const modal = document.getElementById("modalBuscarDestinatario");
  const input = document.getElementById("inputBusqueda");
  const valor = input?.value.trim();

  if (!valor) {
    showWalletToast("Entrez un destinataire valide.", "error");
    return;
  }

  try {
    const destinatario = await buscarDestinatarioWallet(valor);
    destinatarioActual = destinatario;
    cerrarBusqueda();
    abrirConfirmacionTransferencia(destinatario);
  } catch (error) {
    showWalletToast(error.message || "Destinataire non trouve.", "error");
    modal?.classList.remove("hidden");
  }
}

export async function confirmarTransferencia() {
  if (transferenciaEnCurso || !destinatarioActual) return;

  const montoInput = document.getElementById("destMonto");
  const pinInput = document.getElementById("destPin");
  const saldo = Number(document.getElementById("saldoWallet")?.dataset.real || 0);
  const monto = Math.round(Number(montoInput?.value || 0) * 100) / 100;
  const pin = pinInput?.value.trim() || "";

  setInlineError("transferError");

  if (!Number.isFinite(monto) || monto <= 0) {
    setInlineError("transferError", "Montant invalide.");
    return;
  }

  if (monto > saldo) {
    setInlineError("transferError", "Solde insuffisant.");
    return;
  }

  if (!/^\d{4}$/.test(pin)) {
    setInlineError("transferError", "Entrez votre PIN de 4 chiffres.");
    return;
  }

  setTransferBusy(true);

  try {
    await enviarWallet({
      aliasDestino: destinatarioActual.alias,
      monto,
      pin,
    });

    cerrarConfirmacionTransferencia();
    showWalletToast("Transfert envoye avec succes.", "success");
    await refrescarWallet();
  } catch (error) {
    setInlineError("transferError", error.message || "Transfert impossible.");
  } finally {
    setTransferBusy(false);
  }
}

export function cancelarTransferencia() {
  cerrarConfirmacionTransferencia();
}

export async function abrirMovimientos() {
  document.getElementById("modalMovimientosWallet")?.classList.remove("hidden");
  try {
    const movimientos = await obtenerMovimientos();
    renderHistorial(movimientos);
  } catch (error) {
    showWalletToast(error.message || "Historique indisponible.", "error");
  }
}

export function cerrarMovimientos() {
  document.getElementById("modalMovimientosWallet")?.classList.add("hidden");
}

export function mostrarRetiro() {
  document.getElementById("modalRetiroWallet")?.classList.remove("hidden");
}

export function cerrarRetiro() {
  document.getElementById("modalRetiroWallet")?.classList.add("hidden");
}

export async function copiarAlias() {
  const user = getCurrentUser();
  const alias = user?.alias;

  if (!alias) {
    showWalletToast("Alias non disponible.", "error");
    return;
  }

  try {
    await navigator.clipboard?.writeText(alias);
    showWalletToast(`Alias copie: @${alias}`, "success");
  } catch {
    showWalletToast(`Votre alias: @${alias}`, "info");
  }
}

export function abrirAyuda() {
  location.hash = "#/soporte";
}

export async function refrescarWallet() {
  const [wallet, movimientos] = await Promise.all([
    obtenerWallet(),
    obtenerMovimientos(),
  ]);

  actualizarSaldo(wallet.saldo, wallet.saldoBloqueado);
  renderHistorial(movimientos);
  actualizarEstadoSeguridad(wallet);
  return wallet;
}

export function actualizarEstadoSeguridad(wallet = {}) {
  const user = getCurrentUser();
  const aliasLabel = document.getElementById("walletAliasLabel");
  const pinStatus = document.getElementById("walletPinStatus");
  const secureState = document.getElementById("walletSecureState");

  if (aliasLabel) aliasLabel.textContent = user?.alias ? `@${user.alias}` : "Alias";
  if (pinStatus) pinStatus.textContent = wallet.tienePin ? "PIN actif" : "Configurer PIN";
  if (secureState) secureState.textContent = wallet.tienePin ? "Protegee" : "PIN requis";
}

function abrirConfirmacionTransferencia(destinatario) {
  const modal = document.getElementById("modalConfirmTransfer");
  const nombre = [destinatario.nombre, destinatario.apellido].filter(Boolean).join(" ") || "Utilisateur BeGO";
  const foto = destinatario.foto || avatarUrl(nombre);

  document.getElementById("destNombre").textContent = nombre;
  document.getElementById("destAlias").textContent = `@${destinatario.alias}`;
  document.getElementById("destFoto").src = foto;
  document.getElementById("destMonto").value = "";
  document.getElementById("destPin").value = "";
  setInlineError("transferError");

  const saldo = Number(document.getElementById("saldoWallet")?.dataset.real || 0);
  document.getElementById("saldoDisponibleModal").textContent = `HTG ${saldo.toLocaleString("fr-HT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  modal?.classList.remove("hidden");
  document.getElementById("destMonto")?.focus();
}

function cerrarConfirmacionTransferencia() {
  const modal = document.getElementById("modalConfirmTransfer");
  modal?.classList.add("hidden");
  destinatarioActual = null;
  document.getElementById("destMonto").value = "";
  document.getElementById("destPin").value = "";
}

function setTransferBusy(isBusy) {
  transferenciaEnCurso = isBusy;
  const btn = document.getElementById("confirmTransfer");
  const text = document.getElementById("btnText");
  const spinner = document.getElementById("btnSpinner");

  if (btn) btn.disabled = isBusy;
  text?.classList.toggle("oculto", isBusy);
  spinner?.classList.toggle("oculto", !isBusy);
}

function avatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=ffffff`;
}
