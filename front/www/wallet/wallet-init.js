import { obtenerWallet, obtenerMovimientos } from "./wallet-service.js";
import { inicializarVisibilidad, actualizarSaldo, renderHistorial } from "./wallet-ui.js";
import { verificarPinConfigurado } from "./wallet-security.js";

import {
  mostrarRecarga,
  cerrarModalSend,
  mostrarBusqueda,
  cerrarBusqueda,
  abrirEnviar // 🔥 IMPORTANTE
} from "./wallet-operations.js";

import {
  guardarPin,
  abrirCambiarPin,
  cambiarPin,
  cerrarPin
} from "./wallet-pin.js";

/*************************************************
 * 🚀 INIT WALLET (SPA READY)
 *************************************************/
let walletInitialized = false;

export async function initWallet() {
    console.log("💳 Wallet init SPA");

    // 🔥 evitar duplicación REAL
    if (!walletInitialized) {
        document.addEventListener("click", handleWalletClick);
        walletInitialized = true;
    }

    /*************************************************
     * 📦 CARGA INICIAL
     *************************************************/
    try {
        const wallet = await obtenerWallet();
        actualizarSaldo(wallet.saldo);

        const movimientos = await obtenerMovimientos();
        renderHistorial(movimientos);

        await verificarPinConfigurado();
        inicializarVisibilidad();

    } catch (err) {
        console.error("❌ Error inicializando wallet:", err);
    }
}

/*************************************************
 * 🧠 EVENT DELEGATION (CENTRAL)
 *************************************************/
function handleWalletClick(e) {
    const btn = e.target.closest(
        "[data-action], #btnEnviar, .btn-secure, #btnGuardarPin, #btnCambiarPin, #btnCerrarPin"
    );
    if (!btn) return;

    const action = btn.dataset?.action;

    /*************************************************
     * 🎯 ACCIONES POR data-action (PRIORIDAD)
     *************************************************/
    if (action) {
        switch (action) {

            case "recargar":
                mostrarRecarga();
                return;

            case "abrir-config-pin":
                abrirCambiarPin();
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
        }
    }

    /*************************************************
     * 🧩 FALLBACK (IDs / clases)
     *************************************************/
    if (btn.id === "btnEnviar") {
        abrirEnviar();
        return;
    }

    if (btn.classList.contains("btn-secure")) {
        abrirCambiarPin();
        return;
    }

    if (btn.id === "btnGuardarPin") {
        guardarPin();
        return;
    }

    if (btn.id === "btnCambiarPin") {
        cambiarPin();
        return;
    }

    if (btn.id === "btnCerrarPin") {
        cerrarPin();
        return;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const balanceLabel = document.querySelector(".balance-label");
    if (balanceLabel) {
        balanceLabel.innerHTML = 'Wallet pasajero <span class="trend">Protegida</span>';
    }
});
