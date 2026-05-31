/*************************************************
 * 🔐 WALLET PIN
 *************************************************/

import { getToken, getServerUrl } from "./wallet-config.js";

export function abrirConfigPin() {
    document.getElementById("modalPin")?.classList.remove("hidden");
}

export function cerrarPin() {
    document.getElementById("modalPin")?.classList.add("hidden");
}

export async function guardarPin() {
    const pinInput = document.getElementById("nuevoPin");
    const pin = pinInput.value.trim();

    if (!/^\d{4}$/.test(pin)) {
        alert("El PIN debe tener 4 números");
        return;
    }

    const res = await fetch(`${getServerUrl()}/api/wallet/configurar-pin`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ pin })
    });

    const data = await res.json();
    if (!res.ok) {
        alert(data.error);
        return;
    }

    alert("✅ PIN configurado correctamente");
    cerrarPin();
}

export function abrirCambiarPin() {
    document.getElementById("modalCambiarPin")?.classList.remove("hidden");
}

// Función para cerrar el modal
export function cerrarCambiarPin() {
    const modal = document.getElementById("modalCambiarPin");
    if (modal) {
        modal.classList.add("hidden");
    }
}

// Configurar el botón para que cierre el modal
const btnCancelar = document.getElementById("btnCancelarCambiarPin");
if (btnCancelar) {
    btnCancelar.addEventListener("click", cerrarCambiarPin);
}

export async function cambiarPin() {
    const pinActual = document.getElementById("pinActual").value.trim();
    const nuevoPin = document.getElementById("nuevoPinCambio").value.trim();

    if (!/^\d{4}$/.test(nuevoPin)) {
        alert("El nuevo PIN debe tener 4 dígitos");
        return;
    }

    const res = await fetch(`${getServerUrl()}/api/wallet/cambiar-pin`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ pinActual, nuevoPin })
    });

    const data = await res.json();
    if (!res.ok) {
        alert(data.error);
        return;
    }

    alert("✅ PIN actualizado correctamente");
    cerrarCambiarPin();
}