export function renderAyuda() {
  return `
  <div class="css-ayuda">
    <main class="ayuda-container">
      <section class="support-hero ayuda-hero">
        <div>
          <span class="support-kicker">Centro BeGO</span>
          <h1>Ayuda</h1>
          <p>Resuelve dudas de viaje, pagos, cuenta y seguridad desde un solo lugar.</p>
        </div>
        <a class="support-hero-action ripple" href="#/soporte" data-link aria-label="Abrir asistencia">
          <i class="fa-solid fa-headset"></i>
        </a>
      </section>

      <label class="support-search" for="busquedaAyuda">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="search" id="busquedaAyuda" placeholder="Buscar ayuda">
      </label>

      <section class="support-quick-grid" aria-label="Accesos de ayuda">
        <a class="support-action-card featured ripple" href="#/soporte" data-link>
          <i class="fa-solid fa-comments"></i>
          <span>Asistencia en vivo</span>
          <p>Habla con soporte BeGO.</p>
        </a>

        <a class="support-action-card ripple" href="#/actividad" data-link>
          <i class="fa-solid fa-route"></i>
          <span>Mis viajes</span>
          <p>Revisa historial y estados.</p>
        </a>

        <a class="support-action-card ripple" href="#/seguridad" data-link>
          <i class="fa-solid fa-shield-halved"></i>
          <span>Seguridad</span>
          <p>Herramientas para viajar protegido.</p>
        </a>

        <a class="support-action-card ripple" href="#/wallet" data-link>
          <i class="fa-solid fa-wallet"></i>
          <span>Pagos</span>
          <p>Wallet, recargas y saldos.</p>
        </a>
      </section>

      <section class="support-panel">
        <div class="support-section-title">
          <span>Preguntas frecuentes</span>
          <small>Respuesta rápida</small>
        </div>

        <div class="support-faq-list">
          <details class="support-faq-item">
            <summary>
              <span>¿Cómo cancelo un viaje?</span>
              <i class="fa-solid fa-chevron-down"></i>
            </summary>
            <p>Desde la pantalla del viaje puedes tocar Cancelar antes de que el viaje avance a una etapa no cancelable.</p>
          </details>

          <details class="support-faq-item">
            <summary>
              <span>¿Qué hago si el motorista no llega?</span>
              <i class="fa-solid fa-chevron-down"></i>
            </summary>
            <p>Entra a Seguridad o Asistencia para reportarlo, compartir tu viaje o pedir ayuda al equipo BeGO.</p>
          </details>

          <details class="support-faq-item">
            <summary>
              <span>¿Dónde veo mis pagos?</span>
              <i class="fa-solid fa-chevron-down"></i>
            </summary>
            <p>Abre Wallet para consultar saldo, movimientos, recargas y comprobantes disponibles.</p>
          </details>
        </div>
      </section>
    </main>
  </div>
  `;
}
