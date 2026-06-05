import { inicializarVisibilidad } from "./wallet-ui.js?v=20260605-wallet-secure";
import { verificarPinConfigurado } from "./wallet-security.js?v=20260605-wallet-secure";
import { getSocket } from "../js/socket/socket.js";

import {
  abrirAyuda,
  abrirEnviar,
  abrirMovimientos,
  cancelarTransferencia,
  cerrarBusqueda,
  cerrarModalSend,
  cerrarMovimientos,
  cerrarRetiro,
  confirmarTransferencia,
  copiarAlias,
  mostrarBusqueda,
  mostrarRecarga,
  mostrarRetiro,
  procesarBusqueda,
  refrescarWallet,
} from "./wallet-operations.js?v=20260605-wallet-secure";

import {
  abrirCambiarPin,
  cambiarPin,
  cerrarCambiarPin,
  cerrarPin,
  guardarPin,
} from "./wallet-pin.js?v=20260605-wallet-secure";

let walletInitialized = false;
let socketBound = false;

export async function initWallet() {
  if (!walletInitialized) {
    document.addEventListener("click", handleWalletClick);
    document.addEventListener("keydown", handleWalletKeydown);
    walletInitialized = true;
  }

  try {
    const wallet = await refrescarWallet();
    await verificarPinConfigurado(wallet);
    inicializarVisibilidad();
    bindWalletSocket();
  } catch (error) {
    console.error("Error inicializando wallet:", error);
  }
}

function bindWalletSocket() {
  if (socketBound) return;

  const socket = getSocket?.();
  if (!socket) return;

  socketBound = true;
  socket.off("wallet:update", handleWalletUpdate);
  socket.on("wallet:update", handleWalletUpdate);
}

async function handleWalletUpdate(wallet) {
  if (!document.querySelector(".view-wallet-context")) return;

  if (wallet && typeof wallet === "object" && "saldo" in wallet) {
    const { actualizarSaldo, renderHistorial } = await import("./wallet-ui.js?v=20260605-wallet-secure");
    actualizarSaldo(wallet.saldo, wallet.saldoBloqueado);
    if (Array.isArray(wallet.movimientos)) renderHistorial(wallet.movimientos);
    return;
  }

  refrescarWallet().catch(() => {});
}

function handleWalletClick(event) {
  const btn = event.target.closest("[data-action], #btnEnviar, #btnGuardarPin, #btnActualizarPin, #btnCerrarPin, #btnCerrarCambiarPin");
  if (!btn || !document.querySelector(".view-wallet-context")) return;

  const action = btn.dataset?.action;

  if (action) {
    event.preventDefault();

    switch (action) {
      case "recargar":
        mostrarRecarga();
        return;
      case "abrir-config-pin":
        abrirCambiarPin();
        return;
      case "copiar-alias":
        copiarAlias();
        return;
      case "abrir-ayuda":
        abrirAyuda();
        return;
      case "abrir-movimientos":
        abrirMovimientos();
        return;
      case "cerrar-movimientos":
        cerrarMovimientos();
        return;
      case "retirar":
        mostrarRetiro();
        return;
      case "cerrar-retiro":
        cerrarRetiro();
        return;
      case "cerrar-busqueda":
        cerrarBusqueda();
        return;
      case "cerrar-modal-send":
        cerrarModalSend();
        return;
      case "buscar-alias":
        mostrarBusqueda("alias");
        return;
      case "buscar-telefono":
        mostrarBusqueda("telefono");
        return;
      case "procesar-busqueda":
        procesarBusqueda();
        return;
      case "confirmar-transferencia":
        confirmarTransferencia();
        return;
      case "cancelar-transferencia":
        cancelarTransferencia();
        return;
    }
  }

  if (btn.id === "btnEnviar") {
    abrirEnviar();
    return;
  }

  if (btn.id === "btnGuardarPin") {
    guardarPin();
    return;
  }

  if (btn.id === "btnActualizarPin") {
    cambiarPin();
    return;
  }

  if (btn.id === "btnCerrarPin") {
    cerrarPin();
    return;
  }

  if (btn.id === "btnCerrarCambiarPin") {
    cerrarCambiarPin();
  }
}

function handleWalletKeydown(event) {
  if (!document.querySelector(".view-wallet-context")) return;

  if (event.key === "Escape") {
    cerrarBusqueda();
    cerrarModalSend();
    cerrarMovimientos();
    cerrarRetiro();
    cancelarTransferencia();
    cerrarPin();
    cerrarCambiarPin();
  }

  if (event.key === "Enter") {
    const active = document.activeElement;
    if (active?.id === "inputBusqueda") {
      event.preventDefault();
      procesarBusqueda();
    }
    if (active?.id === "destPin" || active?.id === "destMonto") {
      event.preventDefault();
      confirmarTransferencia();
    }
  }
}
