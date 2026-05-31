export function renderRecarga() {
  return `
  <div class="recarga-page">

    <div class="recarga-card">

      <label>Número de celular</label>
      <input type="tel" id="numero" placeholder="Ej: 50912345678">

      <label>Operadora</label>
      <select id="operadora">
        <option value="">Seleccionar</option>
        <option value="digicel">Digicel</option>
        <option value="natcom">Natcom</option>
      </select>

      <label>Monto a recargar</label>

      <div class="montos">
        <button data-monto="50">50 HTG</button>
        <button data-monto="100">100 HTG</button>
        <button data-monto="250">250 HTG</button>
        <button data-monto="500">500 HTG</button>
      </div>

      <div class="monto-custom">
        <input type="number" id="montoManual" placeholder="Otro monto">
      </div>

      <div class="wallet-info">
        <span>Saldo disponible</span>
        <strong id="saldo">HTG 0</strong>
      </div>

      <button id="recargarBtn" class="btn-principal">
        <i class="fa-solid fa-bolt"></i> Recargar ahora
      </button>

      <div class="verificar-firma">
        <a href="#/verificar" data-link>¿Verificar firma digital del recibo?</a>
      </div>

    </div>

    <div id="overlayProcesando" class="overlay hidden">
      <div class="procesando-box">
        <div class="spinner"></div>
        <h3>Procesando recarga</h3>
        <p>No cierres la aplicación…</p>
      </div>
    </div>

  </div>
  `;
}