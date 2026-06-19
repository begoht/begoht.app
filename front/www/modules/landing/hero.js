import { renderPassengerDownloadButton } from "../downloads/downloads.module.js";
import { renderDriverRegistrationButton, renderRegistrationQuickLinks } from "../registro/registro.module.js";

export function renderHero() {
  return `
    <main id="home" class="hero site-shell">
      <section class="hero-copy" aria-labelledby="heroTitle">
        <p class="kicker">Movilidad simple, segura y conectada</p>
        <h1 id="heroTitle">Tu viaje, siempre bajo control</h1>

        <div class="dynamic-caption" aria-live="polite">
          <span>Muévete con</span>
          <strong class="word" id="changingText">confianza</strong>
        </div>

        <p>Solicita un motorista cercano, sigue su ubicación en tiempo real y paga como prefieras. BeGO reúne viajes, envíos y wallet en una sola experiencia.</p>

        <div class="btn-group">
          ${renderPassengerDownloadButton()}
          ${renderDriverRegistrationButton()}
        </div>

        ${renderRegistrationQuickLinks()}
      </section>

      <section class="hero-display" aria-label="Vista BeGO en vivo">
        <div class="mockup-container">
          <div class="app-screen-sim">
            <div class="sim-header">
              <span><i class="bx bx-signal-5" aria-hidden="true"></i> BeGO Live</span>
              <span id="clock">12:00</span>
            </div>
            <div class="sim-map">
              <div class="sim-pulse" aria-hidden="true"></div>
              <i class="bx bx-cycling sim-icon-moto" aria-hidden="true"></i>
            </div>
            <div class="sim-card">
              <div class="sim-card-row">
                <span>Motorista asignado</span>
                <span class="sim-card-state">En ruta</span>
              </div>
              <p>Ubicación actualizada en tiempo real</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}
