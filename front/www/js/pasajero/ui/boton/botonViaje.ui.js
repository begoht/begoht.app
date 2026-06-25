import { viajeState } from "../../../viaje/viaje.state.js";
import { pedirViaje, cancelarViaje } from "../../../viaje/viaje.actions.js?v=20260625-map-instant";
import { mostrarModalConfirmarCancelacion } from "../modales/modalCancelacion.ui.js";

export function actualizarBotonViaje() {
    const btn = document.getElementById("btnPedirViaje");
    const footer = document.querySelector("footer");
    if (!btn || !footer) return;

    const {
        origen,
        destino,
        metodoPago,
        activo,
        cotizando,
        buscando,
        asignado,
    } = viajeState;

    // ✅ ÚNICA FUENTE DE VERDAD
    const listoParaPedir = !!(
        origen &&
        destino &&
        metodoPago &&
        !activo &&
        !cotizando &&
        !buscando &&
        !asignado
    );

    // Reset visual
    btn.classList.remove("btn-ready", "btn-cancel", "btn-searching", "btn-idle");
    footer.classList.remove("buscando", "asignado", "listo");

    // 🚖 ASIGNADO → CANCELAR
    if (asignado) {
        btn.disabled = false;
        btn.classList.add("btn-cancel");

        btn.innerHTML = `
          <span class="footer-action-core">
            <i class="fa-solid fa-xmark"></i>
          </span>
        `;

        btn.onclick = () => {
            mostrarModalConfirmarCancelacion(() => {
                cancelarViaje();
            });
        };

        footer.classList.add("asignado");
        return;
    }

    // 🔍 BUSCANDO
    if (cotizando || viajeState.estado === "cotizando" || buscando) {
        btn.disabled = true;
        btn.onclick = null;
        btn.classList.add("btn-searching");
        btn.innerHTML = `
          <div class="spinner-core">🏍️</div>
        `;

        footer.classList.add("buscando");
        return;
    }

    // ✅ LISTO PARA PEDIR
    btn.disabled = !listoParaPedir;

    if (listoParaPedir) {
        btn.classList.add("btn-ready");

        btn.innerHTML = `
            <span class="footer-action-core">
              <i class="fa-solid fa-route"></i>
            </span>
        `;

        btn.onclick = (e) => {
            e.preventDefault();
            pedirViaje();
        };

    } else {
        btn.classList.add("btn-idle");
        btn.innerHTML = `
            <span class="footer-action-core">
              <i class="fa-solid fa-plus"></i>
            </span>
        `;

        btn.onclick = null;
    }
}
