/*************************************************
 * 💳 MODAL CONFIRMACIÓN
 *************************************************/

let modal = null;

export function mostrarModalConfirmacion(precio, { onConfirm, onCancel } = {}) {
    cerrarModalConfirmacion();

    modal = document.createElement("div");
    modal.id = "modalConfirmacion";

    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-box">
            <h3>Confirmar viaje</h3>
            <p class="precio">💰 Precio: <strong>${precio} G</strong></p>

            <div class="modal-actions">
                <button id="btnConfirmar" class="btn-confirmar">Confirmar</button>
                <button id="btnCancelar" class="btn-cancelar">Cancelar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // ✅ CONFIRMAR
    document.getElementById("btnConfirmar").onclick = () => {
        cerrarModalConfirmacion();

        // 🔥 prioridad: callback moderno
        if (onConfirm) {
            onConfirm();
            return;
        }

        // fallback legacy (por si lo usás en otro lado)
        if (typeof window.confirmarViaje === "function") {
            window.confirmarViaje();
        }
    };

    // ❌ CANCELAR
    document.getElementById("btnCancelar").onclick = () => {
        cerrarModalConfirmacion();

        if (onCancel) {
            onCancel();
            return;
        }

        viajeState.activo = false;
        actualizarBotonViaje();
    };
}

export function cerrarModalConfirmacion() {
    if (modal) {
        modal.remove();
        modal = null;
    }
}