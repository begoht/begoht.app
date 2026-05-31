/*************************************************
 * 🌐 WALLET SERVICE
 *************************************************/

import { getToken, getServerUrl } from "./wallet-config.js";

function createIdempotencyKey() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/*************************************************
 * 💳 OBTENER WALLET
 *************************************************/
export async function obtenerWallet() {
    const res = await fetch(`${getServerUrl()}/api/wallet`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (!res.ok) {
        throw new Error("Error al obtener wallet");
    }

    return res.json();
}

/*************************************************
 * 📜 OBTENER MOVIMIENTOS (CORREGIDO)
 *************************************************/
export async function obtenerMovimientos() {

    const res = await fetch(
        `${getServerUrl()}/api/wallet/movimientos`,
        {
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        }
    );

    if (!res.ok) {
        throw new Error("Error historial");
    }

    return res.json();
}

/*************************************************
 * ➕ RECARGAR WALLET
 *************************************************/
export async function recargarWallet(monto, referencia) {

    const res = await fetch(`${getServerUrl()}/api/wallet/recarga`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            "Idempotency-Key": createIdempotencyKey()
        },
        body: JSON.stringify({ monto, referencia })
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Error recarga");
    }

    return data;
}
