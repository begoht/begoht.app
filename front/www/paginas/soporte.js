export function renderSoporte() {
  return `
  <div class="css-soporte">
    <main class="soporte-container">
      <section class="support-hero soporte-hero">
        <div>
          <span class="support-kicker">Asistencia BeGO</span>
          <h1>Soporte</h1>
          <p>Atención para viajes, pagos, seguridad y cuenta con prioridad según tu situación.</p>
        </div>
        <a class="support-hero-action ripple" href="#/seguridad" data-link aria-label="Abrir seguridad">
          <i class="fa-solid fa-shield-halved"></i>
        </a>
      </section>

      <label class="support-search" for="soporteBusqueda">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input id="soporteBusqueda" type="search" placeholder="Buscar asistencia">
      </label>

      <section class="support-priority-card">
        <div>
          <span>Prioridad alta</span>
          <strong>Viaje en curso</strong>
          <p>Usa Seguridad si necesitas compartir ubicación, reportar o enviar una alerta.</p>
        </div>
        <a class="ripple" href="#/seguridad" data-link>
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      </section>

      <section class="support-quick-grid" aria-label="Canales de asistencia">
        <a class="support-action-card featured ripple" href="paginas/soporte-chat.html">
          <i class="fa-solid fa-comments"></i>
          <span>Chat en vivo</span>
          <p>Hablar con el equipo.</p>
        </a>

        <a class="support-action-card ripple" href="#/actividad" data-link>
          <i class="fa-solid fa-receipt"></i>
          <span>Viajes y recibos</span>
          <p>Resolver cargos o historial.</p>
        </a>

        <a class="support-action-card ripple" href="#/wallet" data-link>
          <i class="fa-solid fa-wallet"></i>
          <span>Pagos</span>
          <p>Wallet, saldo o recarga.</p>
        </a>

        <a class="support-action-card ripple" href="#/cuenta" data-link>
          <i class="fa-solid fa-user-shield"></i>
          <span>Cuenta</span>
          <p>Perfil, acceso y seguridad.</p>
        </a>
      </section>

      <section class="support-panel">
        <div class="support-section-title">
          <span>Temas frecuentes</span>
          <small>Producción</small>
        </div>

        <a class="support-list-row ripple" href="#/actividad" data-link>
          <i class="fa-solid fa-circle-exclamation"></i>
          <div>
            <span>Problema con un viaje</span>
            <p>Revisa la actividad y abre el detalle correspondiente.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="support-list-row ripple" href="#/wallet" data-link>
          <i class="fa-solid fa-credit-card"></i>
          <div>
            <span>Pago o saldo</span>
            <p>Consulta movimientos antes de iniciar un reclamo.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="support-list-row ripple" href="#/ayuda" data-link>
          <i class="fa-solid fa-book-open"></i>
          <div>
            <span>Guía de uso</span>
            <p>Preguntas rápidas sobre BeGO.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>
    </main>
  </div>
  `;
}
