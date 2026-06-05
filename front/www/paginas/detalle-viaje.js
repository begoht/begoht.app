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
          <div class="motorista-rating-pill" id="detalleMotoristaRating">
            <i class="fa-solid fa-star"></i>
            <span>5.0</span>
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
        <div class="rating-modal-head">
          <span class="rating-kicker">Evaluation BeGO</span>
          <button id="cerrarRating" class="rating-close" type="button" aria-label="Fermer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <h3>Noter le conducteur</h3>
        <p class="rating-subtitle">Votre avis aide BeGO a garder une experience fiable.</p>

        <div class="estrellas" role="group" aria-label="Note">
          <button class="rating-star" type="button" data-value="1" aria-label="1 sur 5"><i class="fa-solid fa-star"></i></button>
          <button class="rating-star" type="button" data-value="2" aria-label="2 sur 5"><i class="fa-solid fa-star"></i></button>
          <button class="rating-star" type="button" data-value="3" aria-label="3 sur 5"><i class="fa-solid fa-star"></i></button>
          <button class="rating-star" type="button" data-value="4" aria-label="4 sur 5"><i class="fa-solid fa-star"></i></button>
          <button class="rating-star" type="button" data-value="5" aria-label="5 sur 5"><i class="fa-solid fa-star"></i></button>
        </div>

        <div class="rating-tags" aria-label="Details rapides">
          <button type="button" data-rating-tag="safe">Securite</button>
          <button type="button" data-rating-tag="clean">Moto propre</button>
          <button type="button" data-rating-tag="polite">Courtoisie</button>
          <button type="button" data-rating-tag="fast">Ponctualite</button>
          <button type="button" data-rating-tag="route">Bon trajet</button>
          <button type="button" data-rating-tag="communication">Communication</button>
        </div>

        <textarea id="comentario" maxlength="280" placeholder="Commentaire optionnel"></textarea>
        <p id="ratingStatus" class="rating-status" aria-live="polite"></p>

        <div class="modal-actions">
          <button id="btnEnviarRating" class="btn-primario ripple" type="button">Envoyer</button>
        </div>
      </div>
    </div>
  `;
}
