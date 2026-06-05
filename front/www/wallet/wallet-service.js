/*************************************************
 * 🌐 WALLET SERVICE
 *************************************************/

import { getToken, getServerUrl } from "./wallet-config.js?v=20260605-wallet-secure";

function createIdempotencyKey() {
    return globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readJson(res) {
    try {
        return await res.json();
    } catch {
        return {};
    }
}

/*************************************************
 * 💳 OBTENER WALLET
 *************************************************/
export async function obtenerWallet() {
    const res = await fetch(`${getServerUrl()}/api/wallet`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (!res.ok) {
        const data = await readJson(res);
        throw new Error(data.error || data.msg || "Error al obtener wallet");
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
        const data = await readJson(res);
        throw new Error(data.error || "Error historial");
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

    const data = await readJson(res);

    if (!res.ok) {
        throw new Error(data.error || "Error recarga");
    }

    return data;
}

export async function buscarDestinatarioWallet(valor) {
    const safe = encodeURIComponent(String(valor || "").trim());
    const res = await fetch(`${getServerUrl()}/api/wallet/buscar-alias/${safe}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    const data = await readJson(res);
    if (!res.ok) {
        throw new Error(data.error || "Destinatario no encontrado");
    }

    return data;
}

export async function enviarWallet({ aliasDestino, monto, pin }) {
    const res = await fetch(`${getServerUrl()}/api/wallet/enviar`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            "Idempotency-Key": createIdempotencyKey(),
        },
        body: JSON.stringify({ aliasDestino, monto, pin }),
    });

    const data = await readJson(res);
    if (!res.ok) {
        throw new Error(data.error || "No se pudo completar el envio");
    }

    return data;
}
