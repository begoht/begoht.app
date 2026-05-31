/*************************************************
 * 💸 WALLET OPERATIONS - BeGO PAY
 *************************************************/

import { recargarWallet, obtenerWallet, obtenerMovimientos } from "./wallet-service.js";
import { actualizarSaldo, renderHistorial } from "./wallet-ui.js";
import { getToken, getServerUrl } from "./wallet-config.js";
import { abrirConfigPin } from "./wallet-pin.js";

function createIdempotencyKey() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/*************************************************
 * ➕ RECARGA DE DINERO
 *************************************************/

export async function mostrarRecarga() {
    location.hash = "#/recarga";
    return;
    const montoStr = prompt("Ingrese el monto a recargar:");
    const monto = parseFloat(montoStr);

    if (isNaN(monto) || monto <= 0) {
        if (montoStr !== null) {
            alert("❌ Monto inválido. Ingrese solo números mayores a 0.");
        }
        return;
    }

    try {
        await recargarWallet(monto, "Recarga Manual");
        alert("✅ Recarga exitosa");

        const wallet = await obtenerWallet();
        actualizarSaldo(wallet.saldo);

        const movimientos = await obtenerMovimientos();
        renderHistorial(movimientos);

    } catch (err) {
        alert("❌ " + err.message);
    }
}

/*************************************************
 * 💸 FLUJO DE ENVÍO (MODAL INFERIOR)
 *************************************************/

// Paso 1: Abrir el menú de selección (se activa desde el action-grid)
export async function abrirEnviar() {
    try {
        // Verificamos PIN por seguridad
        const wallet = await obtenerWallet();
        if (wallet.tienePin === false) {
            alert("⚠️ Debes configurar un PIN antes de enviar dinero.");
            abrirConfigPin();
            return;
        }

        // Mostramos el modal que sube desde abajo (tipo Mercado Pago)
        const modalSelect = document.getElementById("modalSelectSendType");
        if (modalSelect) modalSelect.classList.add("active");

    } catch (err) {
        console.error("Error al iniciar envío:", err);
    }
}

export function cerrarModalSend() {
    const modal = document.getElementById("modalSelectSendType");
    if (modal) modal.classList.remove("active");
}

export function mostrarBusqueda(tipo) {
    cerrarModalSend();

    const modal = document.getElementById("modalBuscarDestinatario");
    const titulo = document.getElementById("buscarTitulo");
    const input = document.getElementById("inputBusqueda");

    if (!modal || !input) return;

    input.value = "";
    titulo.innerText = tipo === 'alias'
        ? "Enviar con Alias, CBU o CVU"
        : "Enviar con número de teléfono";

    modal.classList.remove("hidden");

    document.getElementById("btnProcesarBusqueda")
      ?.addEventListener("click", () => {
        const valor = input.value.trim();
        if (!valor) return alert("Ingresa un dato válido");

        modal.classList.add("hidden");
        ejecutarTransferencia(valor);
    });
}

export function cerrarBusqueda() {
    const modal = document.getElementById("modalBuscarDestinatario");
    if (modal) modal.classList.add("hidden");
}

/*************************************************
 * 🚀 PROCESO DE TRANSFERENCIA FINAL
 *************************************************/

async function ejecutarTransferencia(identificador) {
    const token = getToken();
    const aliasDestino = identificador.toLowerCase();

    try {
        // 1. Buscamos al usuario en el servidor
        const resAlias = await fetch(`${getServerUrl()}/api/wallet/buscar-alias/${aliasDestino}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!resAlias.ok) {
            const err = await resAlias.json();
            alert("❌ " + (err.error || "Usuario no encontrado"));
            return;
        }

        const destinatario = await resAlias.json();

        // 2. Preparamos el modal de confirmación con los datos del destinatario
        const modal = document.getElementById("modalConfirmTransfer");
        document.getElementById("destNombre").innerText = (destinatario.nombre && destinatario.apellido) 
            ? `${destinatario.nombre} ${destinatario.apellido}` 
            : (destinatario.nombre || "Usuario BeGO");
        
        document.getElementById("destAlias").innerText = `@${destinatario.alias}`;
        document.getElementById("destFoto").src = destinatario.foto || `https://ui-avatars.com/api/?name=${destinatario.nombre}&background=random`;

        // Mostramos saldo actual en el modal
        const saldoEl = document.getElementById("saldoWallet");
        const saldoDisponible = parseFloat(saldoEl.dataset.real || 0);
        document.getElementById("saldoDisponibleModal").innerText = `$${saldoDisponible.toLocaleString('es-AR')}`;

        modal.classList.remove("hidden");

        // 3. Acción de Confirmar Envío
        document.getElementById("confirmTransfer").onclick = async () => {
            const monto = parseFloat(document.getElementById("destMonto").value);
            const pin = document.getElementById("destPin").value.trim();

            if (isNaN(monto) || monto <= 0 || monto > saldoDisponible) {
                alert("Monto inválido o saldo insuficiente");
                return;
            }
            if (!/^\d{4}$/.test(pin)) {
                alert("Por favor, ingresa tu PIN de 4 dígitos");
                return;
            }

            // UI Feedback: Mostramos spinner
            document.getElementById("btnText").classList.add("oculto");
            document.getElementById("btnSpinner").classList.remove("oculto");

            try {
                const response = await fetch(`${getServerUrl()}/api/wallet/enviar`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "Idempotency-Key": createIdempotencyKey()
                    },
                    body: JSON.stringify({ aliasDestino: destinatario.alias, monto, pin })
                });

                const data = await response.json();

                if (!response.ok) throw new Error(data.error || "Error en la transacción");

                alert("✅ ¡Dinero enviado con éxito!");
                modal.classList.add("hidden");
                document.getElementById("destMonto").value = "";
                document.getElementById("destPin").value = "";

                // Actualizamos la UI de la Wallet
                const wallet = await obtenerWallet();
                actualizarSaldo(wallet.saldo);
                const movs = await obtenerMovimientos();
                renderHistorial(movs);

            } catch (e) {
                alert("❌ " + e.message);
            } finally {
                // Restauramos el botón
                document.getElementById("btnText").classList.remove("oculto");
                document.getElementById("btnSpinner").classList.add("oculto");
            }
        };

        document.getElementById("cancelTransfer").onclick = () => modal.classList.add("hidden");

    } catch (err) {
        alert("Error de conexión con el servidor");
        console.error(err);
    }
}

/*************************************************
 * 🌍 EXPOSICIÓN GLOBAL
 *************************************************/
window.abrirEnviar = abrirEnviar;
window.mostrarRecarga = mostrarRecarga;
window.mostrarBusqueda = mostrarBusqueda;
window.cerrarBusqueda = cerrarBusqueda;
window.cerrarModalSend = cerrarModalSend;

/*************************************************
 * 👁 TOGGLE VISIBILIDAD SALDO (BLUR MODE)
 *************************************************/

document.addEventListener("DOMContentLoaded", () => {
    const saldoEl = document.getElementById("saldoWallet");
    const toggleBtn = document.querySelector(".toggle-visibility");
    const icon = toggleBtn?.querySelector("i");

    if (!saldoEl || !toggleBtn) return;

    let visible = localStorage.getItem("saldoVisible") === "true";

    function renderSaldo() {
        const real = parseFloat(saldoEl.dataset.real || 0);

        // Siempre mostramos el número real
        saldoEl.innerText = real.toLocaleString("es-AR");

        if (visible) {
            saldoEl.classList.remove("blur");
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        } else {
            saldoEl.classList.add("blur");
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        }
    }

    toggleBtn.addEventListener("click", () => {
        visible = !visible;
        localStorage.setItem("saldoVisible", visible);
        renderSaldo();
    });

    renderSaldo();
});
