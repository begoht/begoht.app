import { renderPassengerDownloadButton } from "../downloads/downloads.module.js";
import { renderDriverRegistrationButton, renderRegistrationQuickLinks } from "../registro/registro.module.js";

export function renderHero() {
  return `
    <main id="home" class="hero site-shell">
      <section class="hero-copy" aria-labelledby="heroTitle">
        <p class="kicker">Ecosistema de movilidad inteligente</p>
        <h1 id="heroTitle">BeGO para viajes, envios y pagos</h1>

        <div class="dynamic-caption" aria-live="polite">
          <span>Servicios en</span>
          <strong class="word" id="changingText">Tiempo real</strong>
        </div>

        <p>Una plataforma preparada para crecer por negocios: moto taxi, colis, wallet, soporte y nuevos servicios sin tocar el nucleo publico.</p>

        <div class="btn-group">
          ${renderPassengerDownloadButton()}
          ${renderDriverRegistrationButton()}
        </div>

        ${renderRegistrationQuickLinks()}
      </section>

      <section class="hero-display" aria-label="Vista BeGO en vivo">
        <div class="phone-frame">
          <div class="app-screen-sim">
            <div class="sim-header">
              <span><i class="bx bx-signal-5" aria-hidden="true"></i> BeGO Live</span>
              <span id="clock">12:00</span>
            </div>
            <div class="sim-map">
              <div class="sim-route" aria-hidden="true"></div>
              <img class="sim-moto" src="./assets/icons/moto-transparent.svg" alt="">
              <span class="sim-location sim-location-a" aria-hidden="true"></span>
              <span class="sim-location sim-location-b" aria-hidden="true"></span>
            </div>
            <div class="sim-status">
              <div>
                <span>Viaje activo</span>
                <strong>En ruta</strong>
              </div>
              <i class="bx bx-right-arrow-alt" aria-hidden="true"></i>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}
