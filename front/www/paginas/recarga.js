export function renderRecarga() {
  return `
  <section class="recarga-shell" aria-label="Recarga telefonica">
    <div class="recarga-hero">
      <div>
        <span class="recarga-kicker">Recarga instantanea</span>
        <h1>Recarga tu celular</h1>
        <p>Usa tu Wallet BeGO para enviar saldo a Digicel o Natcom con recibo firmado.</p>
      </div>
      <div class="recarga-wallet-card">
        <span>Saldo disponible</span>
        <strong id="saldo">HTG 0</strong>
      </div>
    </div>

    <form id="recargaForm" class="recarga-card" novalidate>
      <div class="recarga-section-title">
        <span>Destino</span>
        <small>Haiti</small>
      </div>

      <label class="recarga-field">
        <span>Numero de celular</span>
        <div class="recarga-input">
          <i class="fa-solid fa-mobile-screen-button"></i>
          <input type="tel" id="numero" inputmode="numeric" autocomplete="tel" placeholder="509 0000 0000">
        </div>
      </label>

      <input type="hidden" id="operadora" value="">
      <div class="recarga-section-title compact">
        <span>Operadora</span>
        <small>Selecciona una</small>
      </div>
      <div class="recarga-operators" role="radiogroup" aria-label="Operadora">
        <button type="button" class="operator-card" data-operadora="digicel" aria-pressed="false">
          <i class="fa-solid fa-signal"></i>
          <span>Digicel</span>
          <small>Recarga movil</small>
        </button>
        <button type="button" class="operator-card" data-operadora="natcom" aria-pressed="false">
          <i class="fa-solid fa-tower-cell"></i>
          <span>Natcom</span>
          <small>Recarga movil</small>
        </button>
      </div>

      <div class="recarga-section-title compact">
        <span>Monto</span>
        <small>HTG</small>
      </div>
      <div class="montos" aria-label="Montos rapidos">
        <button type="button" data-monto="50">50</button>
        <button type="button" data-monto="100">100</button>
        <button type="button" data-monto="250">250</button>
        <button type="button" data-monto="500">500</button>
        <button type="button" data-monto="1000">1000</button>
        <button type="button" data-monto="2000">2000</button>
      </div>

      <label class="recarga-field">
        <span>Otro monto</span>
        <div class="recarga-input">
          <i class="fa-solid fa-gourde-sign"></i>
          <input type="number" id="montoManual" inputmode="decimal" min="10" max="5000" placeholder="Ej: 750">
        </div>
      </label>

      <div class="recarga-summary" aria-live="polite">
        <div>
          <span>Recarga</span>
          <strong id="summaryMonto">HTG 0</strong>
        </div>
        <div>
          <span>Saldo despues</span>
          <strong id="summarySaldo">HTG 0</strong>
        </div>
      </div>

      <p id="recargaMsg" class="recarga-msg" aria-live="polite"></p>

      <button id="recargarBtn" class="btn-principal" type="submit">
        <i class="fa-solid fa-bolt"></i>
        <span>Recargar ahora</span>
      </button>

      <a class="recarga-verify" href="#/verificar" data-link>
        <i class="fa-solid fa-shield-halved"></i>
        <span>Verificar firma digital del recibo</span>
      </a>
    </form>

    <div class="recarga-trust-grid">
      <article>
        <i class="fa-solid fa-receipt"></i>
        <span>Recibo firmado</span>
      </article>
      <article>
        <i class="fa-solid fa-lock"></i>
        <span>Pago desde wallet</span>
      </article>
      <article>
        <i class="fa-solid fa-clock"></i>
        <span>Proceso inmediato</span>
      </article>
    </div>

    <div id="overlayProcesando" class="recarga-overlay hidden">
      <div class="procesando-box">
        <div class="spinner"></div>
        <h3>Procesando recarga</h3>
        <p>Estamos confirmando la operacion de forma segura.</p>
      </div>
    </div>
  </section>
  `;
}
