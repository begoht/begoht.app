export function mostrarPagoNoDisponible({ metodo = "pago" } = {}) {
  document.getElementById("pagoNoDisponibleModal")?.remove();

  const metodoNormalizado = String(metodo || "pago").toLowerCase();
  const nombre = {
    moncash: "MonCash",
    natcash: "NatCash",
    pago: "Paiement"
  }[metodoNormalizado] || metodoNormalizado.replace(/^\w/, (letra) => letra.toUpperCase());

  const modal = document.createElement("div");
  modal.id = "pagoNoDisponibleModal";
  modal.innerHTML = `
    <div class="pago-no-disponible-overlay">
      <div class="pago-no-disponible-card" role="dialog" aria-modal="true" aria-labelledby="pagoNoDisponibleTitulo">
        <div class="pago-no-disponible-icon">
          <i class="fa-solid fa-clock"></i>
        </div>

        <span class="pago-no-disponible-kicker">BeGO Paiement</span>
        <h2 id="pagoNoDisponibleTitulo">${nombre} indisponible</h2>
        <p>Ce mode de paiement n'est pas disponible pour le moment. Vous pouvez continuer avec Cash ou Wallet BeGO.</p>

        <button id="btnPagoNoDisponibleCerrar" type="button">Compris</button>
      </div>
    </div>

    <style>
      .pago-no-disponible-overlay {
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

      .pago-no-disponible-card {
        width: min(100%, 372px);
        box-sizing: border-box;
        padding: 22px 20px 18px;
        border-radius: 24px;
        color: #f8fafc;
        text-align: center;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 50% -12%, rgba(37, 99, 235, 0.26), transparent 36%),
          linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(3, 7, 18, 0.99));
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.56);
        animation: pagoNoDisponibleIn 0.22s ease;
      }

      .pago-no-disponible-icon {
        width: 58px;
        height: 58px;
        display: grid;
        place-items: center;
        margin: 0 auto 12px;
        border-radius: 19px;
        color: #dbeafe;
        font-size: 1.45rem;
        background: linear-gradient(180deg, rgba(37, 99, 235, 0.92), rgba(14, 116, 144, 0.92));
        box-shadow: 0 18px 34px rgba(37, 99, 235, 0.26);
      }

      .pago-no-disponible-kicker {
        display: block;
        color: #94a3b8;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .pago-no-disponible-card h2 {
        margin: 5px 0 8px;
        color: #ffffff;
        font-size: 1.36rem;
        line-height: 1.15;
        letter-spacing: 0;
      }

      .pago-no-disponible-card p {
        margin: 0;
        color: #cbd5e1;
        font-size: 0.92rem;
        line-height: 1.4;
      }

      .pago-no-disponible-card button {
        width: 100%;
        min-height: 50px;
        margin-top: 17px;
        border: 0;
        border-radius: 16px;
        color: #ffffff;
        background: linear-gradient(135deg, #2563eb, #0891b2);
        font: inherit;
        font-weight: 950;
        cursor: pointer;
        box-shadow: 0 14px 26px rgba(37, 99, 235, 0.24);
      }

      .pago-no-disponible-card button:active {
        transform: scale(0.98);
      }

      @keyframes pagoNoDisponibleIn {
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

  modal.querySelector("#btnPagoNoDisponibleCerrar")?.addEventListener("click", () => {
    modal.remove();
  });
}
