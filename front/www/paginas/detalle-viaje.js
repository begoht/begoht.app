export function renderDetalleViaje() {
  return `
    <main class="detalle-page">

      <section class="detalle-estado">
        <span class="estado-badge completado">—</span>
        <small>—</small>
      </section>

      <section class="detalle-mapa">
        <div id="mapDetalle" style="height:220px;border-radius:16px;"></div>
      </section>

      <section class="detalle-ruta">
        <div class="ruta-linea">
          <i class="fa-solid fa-circle-dot inicio"></i>
          <div class="ruta-texto"></div>
          <i class="fa-solid fa-location-dot destino"></i>
        </div>
      </section>

      <section class="detalle-motorista">
        <h3>Motorista</h3>
        <div class="motorista-card">
          <i class="fa-solid fa-user"></i>
          <div class="motorista-detalle">
            <strong>—</strong>
            <p>⭐ BeGO</p>
          </div>
        </div>
      </section>

      <section class="detalle-pago">
        <h3>Pago</h3>
        <div class="pago-linea">
          <span>Total</span>
          <strong>HTG —</strong>
        </div>
      </section>

      <section class="detalle-acciones">
        <button class="btn-secundario ripple">
          <i class="fa-solid fa-rotate"></i>
          Repetir viaje
        </button>

        <button class="btn-primario ripple">
          <i class="fa-solid fa-star"></i>
          Calificar
        </button>
      </section>

    </main>

    <div id="modalRating" class="modal hidden">
      <div class="modal-content">
        <h3>Calificar motorista</h3>

        <div class="estrellas">
          <i class="fa-solid fa-star" data-value="1"></i>
          <i class="fa-solid fa-star" data-value="2"></i>
          <i class="fa-solid fa-star" data-value="3"></i>
          <i class="fa-solid fa-star" data-value="4"></i>
          <i class="fa-solid fa-star" data-value="5"></i>
        </div>

        <textarea id="comentario" placeholder="Comentario (opcional)"></textarea>

        <div class="modal-actions">
          <button id="cerrarRating" class="btn-secundario ripple">Cancelar</button>
          <button id="btnEnviarRating" class="btn-primario ripple">Enviar</button>
        </div>
      </div>
    </div>
  `;
}