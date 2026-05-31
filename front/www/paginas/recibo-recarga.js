export function renderReciboRecarga() {
  return `
  <div class="recibo-page">

    <div class="recibo-card">
      <h1>📱 Recarga de Celular</h1>

      <p>Número: <strong id="numero"></strong></p>
      <p>Operadora: <strong id="operadora"></strong></p>
      <p>Monto: <strong id="monto"></strong></p>
      <p>Fecha: <strong id="fecha"></strong></p>
      <p>Estado: <strong id="estado"></strong></p>

      <div class="firma">
        Firma BeGO: <strong id="firmaBeGO"></strong>
      </div>

      <div class="btns">
        <button id="btnDescargar" class="btn btn-pdf">
          <i class="fa-solid fa-file-pdf"></i> Descargar PDF
        </button>

        <button id="btnHome" class="btn btn-home">
          <i class="fa-solid fa-house"></i> Volver
        </button>
      </div>
    </div>

  </div>
  `;
}