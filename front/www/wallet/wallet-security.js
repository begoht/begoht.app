/*************************************************
 * 🛡 WALLET SECURITY
 *************************************************/

import { obtenerWallet } from "./wallet-service.js";
import { abrirConfigPin } from "./wallet-pin.js";

export async function verificarPinConfigurado() {
    try {
        const wallet = await obtenerWallet();
        if (wallet.tienePin === false) {
            abrirConfigPin();
        }
    } catch (err) {
        console.error("Error verificando PIN", err);
    }
}