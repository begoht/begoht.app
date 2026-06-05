/*************************************************
 * 🛡 WALLET SECURITY
 *************************************************/

import { obtenerWallet } from "./wallet-service.js?v=20260605-wallet-secure";
import { abrirConfigPin } from "./wallet-pin.js?v=20260605-wallet-secure";

export async function verificarPinConfigurado(walletActual = null) {
    try {
        const wallet = walletActual || await obtenerWallet();
        if (wallet.tienePin === false) {
            abrirConfigPin();
        }
    } catch (err) {
        console.error("Error verificando PIN", err);
    }
}
