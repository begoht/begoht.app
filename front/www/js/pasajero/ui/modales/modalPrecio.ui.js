function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function money(value) {
    const amount = Number(value);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${Math.round(safeAmount).toLocaleString("fr-HT")} HTG`;
}

function formatKm(value) {
    const km = Number(value);
    if (!Number.isFinite(km) || km <= 0) return "--";
    return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

function getPaymentLabel(metodoPago) {
    return {
        efectivo: "Especes",
        wallet: "Wallet BeGO",
        moncash: "MonCash",
        natcash: "NatCash"
    }[String(metodoPago || "").toLowerCase()] || "Paiement";
}

/*************************************************
 * MODAL CONFIRMAR VIAJE (PREMIUM)
 *************************************************/
export function mostrarModalPrecio({ precio, precioBase = null, descuentoWallet = 0, walletDiscount = null, distanciaKm, metodoPago, tipo = "viaje", paquete = null, onConfirm, onCancel }) {
    cerrarModalPrecio();

    const esEnvio = tipo === "envio";
    const peso = Number(paquete?.pesoKg || 0);
    const ahorroWallet = Number(descuentoWallet || walletDiscount?.discountAmount || 0);
    const precioOriginal = Number(precioBase || walletDiscount?.basePrice || precio || 0);
    const metodo = String(metodoPago || "").toLowerCase();
    const tieneDescuentoWallet = metodo === "wallet" && ahorroWallet > 0;
    const labelDescuento = escapeHtml(walletDiscount?.label || "Remise Wallet");
    const descripcionPaquete = escapeHtml(paquete?.descripcion || "");
    const instruccionesPaquete = escapeHtml(paquete?.instrucciones || "");

    const descuentoHtml = tieneDescuentoWallet ? `
      <div class="precio-wallet">
        <div>
          <span>${labelDescuento}</span>
          <strong>-${money(ahorroWallet)}</strong>
        </div>
        <p>Prix avant remise: <s>${money(precioOriginal)}</s></p>
      </div>
    ` : "";

    const paqueteHtml = esEnvio && paquete ? `
      <div class="precio-paquete">
        <div class="precio-section-icon"><i class="fa-solid fa-box"></i></div>
        <div>
          <span>Colis BeGO</span>
          <strong>${Number.isFinite(peso) ? peso.toFixed(1) : "0.0"} kg maximum 5 kg</strong>
          ${descripcionPaquete ? `<p>${descripcionPaquete}</p>` : ""}
          ${instruccionesPaquete ? `<p>${instruccionesPaquete}</p>` : ""}
          <small>Le code de livraison sera genere apres confirmation.</small>
        </div>
      </div>
    ` : "";

    const modal = document.createElement("div");
    modal.id = "modalPrecio";

    modal.innerHTML = `
    <div class="precio-overlay">
      <div class="precio-card" role="dialog" aria-modal="true" aria-labelledby="precioTitulo">
        <div class="precio-hero">
          <div class="precio-brand">
            <span>${esEnvio ? "Livraison" : "Course"}</span>
            <strong>BeGO</strong>
          </div>
          <button id="btnCancelarPrecioTop" class="precio-close" type="button" aria-label="Annuler">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="precio-title">
          <span>Tarif estime</span>
          <h2 id="precioTitulo">${esEnvio ? "Confirmer l'envoi" : "Confirmer la course"}</h2>
        </div>

        <div class="precio-total">
          <span>Total</span>
          <strong>${money(precio)}</strong>
        </div>

        <div class="precio-grid">
          <div>
            <i class="fa-solid fa-route"></i>
            <span>Distance</span>
            <strong>${formatKm(distanciaKm)}</strong>
          </div>
          <div>
            <i class="fa-solid fa-wallet"></i>
            <span>Paiement</span>
            <strong>${escapeHtml(getPaymentLabel(metodoPago))}</strong>
          </div>
        </div>

        ${descuentoHtml}
        ${paqueteHtml}

        <div class="precio-note">
          <i class="fa-solid fa-shield-halved"></i>
          <span>Le prix est confirme avant la recherche du motorista.</span>
        </div>

        <div class="precio-actions">
          <button id="btnCancelarPrecio" class="precio-secondary" type="button">Annuler</button>
          <button id="btnConfirmarPrecio" class="precio-primary" type="button">
            ${esEnvio ? "Confirmer l'envoi" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>

    <style>
      .precio-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: grid;
        place-items: center;
        padding: max(16px, env(safe-area-inset-top)) 14px max(16px, env(safe-area-inset-bottom));
        background: rgba(2, 6, 23, 0.74);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        animation: precioFade 0.2s ease;
      }

      .precio-card {
        width: min(100%, 392px);
        max-height: calc(100vh - 32px);
        overflow: auto;
        box-sizing: border-box;
        border-radius: 28px;
        padding: 18px;
        color: #f8fafc;
        background:
          radial-gradient(circle at 18% -8%, rgba(37, 99, 235, 0.32), transparent 34%),
          radial-gradient(circle at 102% 8%, rgba(34, 197, 94, 0.18), transparent 30%),
          linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(3, 7, 18, 0.99));
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow:
          0 28px 80px rgba(0, 0, 0, 0.56),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        animation: precioScale 0.22s ease;
      }

      .precio-hero,
      .precio-actions,
      .precio-total,
      .precio-wallet div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .precio-brand {
        display: grid;
        gap: 2px;
      }

      .precio-brand span,
      .precio-title span,
      .precio-total span,
      .precio-grid span,
      .precio-wallet span,
      .precio-paquete span {
        color: #94a3b8;
        font-size: 0.72rem;
        font-weight: 900;
        line-height: 1.1;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .precio-brand strong {
        color: #fff;
        font-size: 1rem;
        font-weight: 950;
      }

      .precio-close {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 15px;
        color: #e2e8f0;
        background: rgba(15, 23, 42, 0.76);
        cursor: pointer;
      }

      .precio-title {
        margin-top: 18px;
      }

      .precio-title h2 {
        margin: 5px 0 0;
        color: #ffffff;
        font-size: 1.45rem;
        line-height: 1.12;
        letter-spacing: 0;
      }

      .precio-total {
        margin-top: 16px;
        padding: 16px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.24), rgba(14, 116, 144, 0.14));
        border: 1px solid rgba(96, 165, 250, 0.22);
      }

      .precio-total strong {
        color: #dbeafe;
        font-size: 1.85rem;
        line-height: 1;
        font-weight: 950;
        white-space: nowrap;
      }

      .precio-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 12px;
      }

      .precio-grid div {
        min-width: 0;
        display: grid;
        gap: 5px;
        padding: 14px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(148, 163, 184, 0.12);
      }

      .precio-grid i {
        color: #93c5fd;
        font-size: 1rem;
      }

      .precio-grid strong {
        min-width: 0;
        color: #f8fafc;
        font-size: 0.94rem;
        line-height: 1.15;
        word-break: break-word;
      }

      .precio-wallet,
      .precio-paquete,
      .precio-note {
        margin-top: 12px;
        border-radius: 18px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        background: rgba(15, 23, 42, 0.66);
      }

      .precio-wallet {
        padding: 14px;
        border-color: rgba(34, 197, 94, 0.2);
        background: linear-gradient(180deg, rgba(20, 83, 45, 0.28), rgba(15, 23, 42, 0.72));
      }

      .precio-wallet strong {
        color: #86efac;
        font-size: 1.05rem;
        white-space: nowrap;
      }

      .precio-wallet p,
      .precio-paquete p,
      .precio-paquete small,
      .precio-note span {
        margin: 6px 0 0;
        color: #cbd5e1;
        font-size: 0.82rem;
        line-height: 1.35;
      }

      .precio-paquete {
        display: grid;
        grid-template-columns: 42px 1fr;
        gap: 12px;
        padding: 14px;
      }

      .precio-section-icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 15px;
        color: #cffafe;
        background: rgba(14, 165, 233, 0.18);
        border: 1px solid rgba(56, 189, 248, 0.18);
      }

      .precio-paquete strong {
        display: block;
        margin-top: 4px;
        color: #f8fafc;
        font-size: 0.95rem;
      }

      .precio-note {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 13px;
      }

      .precio-note i {
        margin-top: 2px;
        color: #93c5fd;
      }

      .precio-note span {
        margin: 0;
      }

      .precio-actions {
        margin-top: 14px;
      }

      .precio-actions button {
        min-width: 0;
        min-height: 52px;
        flex: 1;
        border: 0;
        border-radius: 17px;
        font: inherit;
        font-weight: 950;
        cursor: pointer;
      }

      .precio-secondary {
        color: #dbeafe;
        background: rgba(30, 41, 59, 0.94);
        border: 1px solid rgba(148, 163, 184, 0.16) !important;
      }

      .precio-primary {
        color: #ffffff;
        background: linear-gradient(135deg, #2563eb, #0891b2);
        box-shadow: 0 16px 30px rgba(37, 99, 235, 0.25);
      }

      .precio-actions button:active,
      .precio-close:active {
        transform: scale(0.98);
      }

      .precio-actions button:disabled {
        opacity: 0.68;
        cursor: wait;
      }

      @media (max-width: 360px) {
        .precio-card {
          padding: 15px;
          border-radius: 24px;
        }

        .precio-title h2 {
          font-size: 1.26rem;
        }

        .precio-total strong {
          font-size: 1.55rem;
        }

        .precio-actions {
          display: grid;
        }
      }

      @keyframes precioFade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes precioScale { from { transform: scale(0.94); opacity: 0 } to { transform: scale(1); opacity: 1 } }
    </style>
    `;

    document.body.appendChild(modal);

    const cancelar = () => {
        onCancel?.();
        cerrarModalPrecio();
    };

    const btnConfirmar = modal.querySelector("#btnConfirmarPrecio");
    const btnCancelar = modal.querySelector("#btnCancelarPrecio");
    const btnCerrar = modal.querySelector("#btnCancelarPrecioTop");

    btnConfirmar?.addEventListener("click", () => {
        btnConfirmar.disabled = true;
        if (btnCancelar) btnCancelar.disabled = true;
        if (btnCerrar) btnCerrar.disabled = true;
        onConfirm?.();
        cerrarModalPrecio();
    }, { once: true });

    btnCancelar?.addEventListener("click", cancelar, { once: true });
    btnCerrar?.addEventListener("click", cancelar, { once: true });
}

export function cerrarModalPrecio() {
    const modal = document.getElementById("modalPrecio");
    if (modal) modal.remove();
}
