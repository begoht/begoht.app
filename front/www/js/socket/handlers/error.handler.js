import { viajeState } from "../../viaje/viaje.state.js";
import { manejarCancelacionOLimpieza } from "../pasajero.utils.js";
import { mostrarPagoNoDisponible } from "../../pasajero/ui/modales/pagoNoDisponible.ui.js?v=20260606-payment-methods";
import { clearCotizacionTimer, resetCotizacionPendiente } from "../../viaje/viaje.actions.js?v=20260628-dark-route-locked";

const ESTADOS_PROTEGIDOS = [
  "buscando",
  "reservado",
  "asignado",
  "llego",
  "en_curso"
];

const money = (value) => {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${Math.round(safeAmount).toLocaleString("fr-HT")} HTG`;
};

function cerrarModalSaldoWallet() {
  document.getElementById("walletSaldoModal")?.remove();
}

function limpiarIntentoWalletSiCorresponde() {
  const tieneFlujoActivo =
    viajeState.activo ||
    viajeState.buscando ||
    ESTADOS_PROTEGIDOS.includes(viajeState.estado);

  if (tieneFlujoActivo) {
    manejarCancelacionOLimpieza(true);
    return;
  }

  document.getElementById("modalPrecio")?.remove();
}

function mostrarModalSaldoInsuficiente({ saldo = 0, requerido = 0, faltante = 0 } = {}) {
  cerrarModalSaldoWallet();

  const modal = document.createElement("div");
  modal.id = "walletSaldoModal";
  modal.innerHTML = `
    <div class="wallet-saldo-overlay">
      <div class="wallet-saldo-card" role="dialog" aria-modal="true" aria-labelledby="walletSaldoTitulo">
        <div class="wallet-saldo-icon">
          <i class="fa-solid fa-wallet"></i>
        </div>

        <div class="wallet-saldo-head">
          <span>Wallet BeGO</span>
          <h2 id="walletSaldoTitulo">Solde insuffisant</h2>
          <p>Rechargez votre wallet ou choisissez un autre mode de paiement pour continuer.</p>
        </div>

        <div class="wallet-saldo-grid">
          <div>
            <span>Disponible</span>
            <strong>${money(saldo)}</strong>
          </div>
          <div>
            <span>Course</span>
            <strong>${money(requerido)}</strong>
          </div>
        </div>

        <div class="wallet-saldo-manque">
          <span>Montant manquant</span>
          <strong>${money(faltante)}</strong>
        </div>

        <div class="wallet-saldo-actions">
          <button id="btnWalletRecargar" class="wallet-saldo-primary" type="button">
            Recharger wallet
          </button>
          <button id="btnWalletCambiarPago" class="wallet-saldo-secondary" type="button">
            Changer de paiement
          </button>
        </div>
      </div>
    </div>

    <style>
      .wallet-saldo-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: grid;
        place-items: center;
        padding: max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom));
        background: rgba(2, 6, 23, 0.74);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      .wallet-saldo-card {
        width: min(100%, 390px);
        max-height: calc(100vh - 36px);
        overflow: auto;
        box-sizing: border-box;
        padding: 20px;
        border-radius: 24px;
        color: #f8fafc;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 50% -12%, rgba(37, 99, 235, 0.28), transparent 36%),
          linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(3, 7, 18, 0.99));
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.56);
        animation: walletSaldoIn 0.22s ease;
      }

      .wallet-saldo-icon {
        width: 62px;
        height: 62px;
        display: grid;
        place-items: center;
        margin: 0 auto 12px;
        border-radius: 20px;
        color: #dbeafe;
        font-size: 1.55rem;
        background: linear-gradient(180deg, rgba(37, 99, 235, 0.92), rgba(14, 116, 144, 0.92));
        box-shadow: 0 18px 34px rgba(37, 99, 235, 0.28);
      }

      .wallet-saldo-head {
        text-align: center;
      }

      .wallet-saldo-head span,
      .wallet-saldo-grid span,
      .wallet-saldo-manque span {
        display: block;
        color: #94a3b8;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .wallet-saldo-head h2 {
        margin: 5px 0 6px;
        color: #ffffff;
        font-size: 1.45rem;
        line-height: 1.15;
        letter-spacing: 0;
      }

      .wallet-saldo-head p {
        margin: 0;
        color: #cbd5e1;
        font-size: 0.92rem;
        line-height: 1.38;
      }

      .wallet-saldo-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 16px;
      }

      .wallet-saldo-grid div,
      .wallet-saldo-manque {
        min-width: 0;
        padding: 14px;
        border-radius: 17px;
        background: rgba(15, 23, 42, 0.76);
        border: 1px solid rgba(148, 163, 184, 0.12);
      }

      .wallet-saldo-grid strong,
      .wallet-saldo-manque strong {
        display: block;
        margin-top: 5px;
        color: #f8fafc;
        font-size: 1rem;
        line-height: 1.1;
        word-break: break-word;
      }

      .wallet-saldo-manque {
        margin-top: 10px;
        border-color: rgba(248, 113, 113, 0.24);
        background: linear-gradient(180deg, rgba(127, 29, 29, 0.28), rgba(15, 23, 42, 0.78));
      }

      .wallet-saldo-manque strong {
        color: #fecaca;
        font-size: 1.25rem;
        font-weight: 950;
      }

      .wallet-saldo-actions {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }

      .wallet-saldo-actions button {
        width: 100%;
        min-height: 50px;
        border: 0;
        border-radius: 16px;
        font: inherit;
        font-weight: 950;
        cursor: pointer;
      }

      .wallet-saldo-primary {
        color: #ffffff;
        background: linear-gradient(135deg, #2563eb, #0891b2);
        box-shadow: 0 14px 26px rgba(37, 99, 235, 0.24);
      }

      .wallet-saldo-secondary {
        color: #dbeafe;
        background: rgba(30, 41, 59, 0.96);
        border: 1px solid rgba(148, 163, 184, 0.14) !important;
      }

      .wallet-saldo-actions button:active {
        transform: scale(0.98);
      }

      @media (max-width: 360px) {
        .wallet-saldo-card {
          padding: 16px;
          border-radius: 21px;
        }

        .wallet-saldo-grid {
          grid-template-columns: 1fr;
        }
      }

      @keyframes walletSaldoIn {
        from {
          opacity: 0;
          transform: scale(0.94);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    </style>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#btnWalletRecargar")?.addEventListener("click", () => {
    cerrarModalSaldoWallet();
    location.hash = "#/recarga";
  });

  modal.querySelector("#btnWalletCambiarPago")?.addEventListener("click", cerrarModalSaldoWallet);
}

export const handleError = (data = {}) => {
  const { mensaje, code, metodoPago, quoteId } = data;
  const esCotizacion = viajeState.cotizando || viajeState.estado === "cotizando";

  if (esCotizacion && quoteId && viajeState.quoteId && quoteId !== viajeState.quoteId) {
    console.warn("Error de cotizacion vieja ignorado:", quoteId);
    return;
  }

  if (esCotizacion) {
    clearCotizacionTimer();
  }

  if (code === "SALDO_INSUFICIENTE") {
    if (esCotizacion) {
      resetCotizacionPendiente();
    } else {
      limpiarIntentoWalletSiCorresponde();
    }
    mostrarModalSaldoInsuficiente(data);
    return;
  }

  if (code === "PAGO_NO_DISPONIBLE") {
    if (esCotizacion) {
      resetCotizacionPendiente();
    } else {
      document.getElementById("modalPrecio")?.remove();
    }
    mostrarPagoNoDisponible({ metodo: metodoPago || "pago" });
    return;
  }

  if (ESTADOS_PROTEGIDOS.includes(viajeState.estado)) {
    console.warn(`Error ignorado (${viajeState.estado})`);
    return;
  }

  if (esCotizacion) {
    resetCotizacionPendiente();
  } else {
    manejarCancelacionOLimpieza();
  }

  alert(mensaje || "No pudimos completar la solicitud. Intenta nuevamente.");
};
