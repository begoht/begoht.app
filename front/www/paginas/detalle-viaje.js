export function renderDetalleViaje() {
  return `
    <section class="detalle-viaje-page">
      <section class="detalle-hero">
        <div class="detalle-hero-top">
          <div class="detalle-icono" id="detalleIcono">
            <i class="fa-solid fa-motorcycle"></i>
          </div>
          <div class="detalle-estado-copy">
            <span id="detalleTipo">Course BeGO</span>
            <strong id="detalleEstado">--</strong>
            <small id="detalleFecha">--</small>
          </div>
          <span class="detalle-badge" id="detalleBadge">--</span>
        </div>

        <div class="detalle-total-card">
          <span>Montant total</span>
          <strong id="detalleTotal">HTG --</strong>
          <small id="detallePago">Paiement --</small>
        </div>
      </section>

      <section class="detalle-mapa-card">
        <div id="mapDetalle"></div>
        <div class="mapa-overlay">
          <i class="fa-solid fa-route"></i>
          <span id="detalleDistancia">-- km</span>
        </div>
      </section>

      <section class="detalle-card detalle-route-card">
        <div class="section-title">
          <span>Itineraire</span>
          <i class="fa-solid fa-location-arrow"></i>
        </div>
        <div class="ruta-premium">
          <div class="ruta-rail">
            <span class="rail-dot start"></span>
            <span class="rail-line"></span>
            <span class="rail-dot end"></span>
          </div>
          <div class="ruta-copy">
            <article>
              <small>Depart</small>
              <strong id="detalleOrigen">--</strong>
            </article>
            <article>
              <small>Destination</small>
              <strong id="detalleDestino">--</strong>
            </article>
          </div>
        </div>
      </section>

      <section class="detalle-grid">
        <article class="mini-stat">
          <i class="fa-solid fa-clock"></i>
          <span>Duree</span>
          <strong id="detalleDuracion">--</strong>
        </article>
        <article class="mini-stat">
          <i class="fa-solid fa-receipt"></i>
          <span>ID voyage</span>
          <strong id="detalleId">--</strong>
        </article>
      </section>

      <section class="detalle-card motorista-card-premium">
        <div class="section-title">
          <span>Conducteur</span>
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <div class="motorista-row">
          <div class="motorista-avatar" id="detalleMotoristaInicial">B</div>
          <div class="motorista-info">
            <strong id="detalleMotorista">Socio BeGO</strong>
            <span id="detalleVehiculo">Moto BeGO</span>
            <small id="detalleTelefono">Verification BeGO</small>
          </div>
        </div>
      </section>

      <section class="detalle-card detalle-security">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <strong>Trajet protege par BeGO</strong>
          <p>Les informations de cette course restent disponibles dans votre activite.</p>
        </div>
      </section>

      <section class="detalle-acciones">
        <button id="btnRepetirViaje" class="detalle-action secondary ripple" type="button">
          <i class="fa-solid fa-rotate-right"></i>
          <span>Repeter</span>
        </button>

        <button id="btnCalificarViaje" class="detalle-action primary ripple" type="button">
          <i class="fa-solid fa-star"></i>
          <span>Noter</span>
        </button>
      </section>
    </section>

    <div id="modalRating" class="modal hidden">
      <div class="modal-content detalle-rating-modal">
        <span class="rating-kicker">Evaluation BeGO</span>
        <h3>Noter le conducteur</h3>

        <div class="estrellas">
          <i class="fa-solid fa-star" data-value="1"></i>
          <i class="fa-solid fa-star" data-value="2"></i>
          <i class="fa-solid fa-star" data-value="3"></i>
          <i class="fa-solid fa-star" data-value="4"></i>
          <i class="fa-solid fa-star" data-value="5"></i>
        </div>

        <textarea id="comentario" placeholder="Commentaire optionnel"></textarea>

        <div class="modal-actions">
          <button id="cerrarRating" class="btn-secundario ripple" type="button">Annuler</button>
          <button id="btnEnviarRating" class="btn-primario ripple" type="button">Envoyer</button>
        </div>
      </div>
    </div>
  `;
}
