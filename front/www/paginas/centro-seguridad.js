export function renderSeguridad() {
  return `
  <div class="css-seguridad">
    <main class="seguridad">
      <section class="support-hero security-hero">
        <div>
          <span class="support-kicker">Protección activa</span>
          <h1>Seguridad</h1>
          <p>Acciones rápidas para compartir tu viaje, pedir ayuda y reportar cualquier situación.</p>
        </div>
        <button class="security-sos-fab ripple" id="btnSOS" data-action="sos" type="button" aria-label="Enviar emergencia">
          SOS
        </button>
      </section>

      <section id="viajeActivoBox" class="security-active-trip">
        <i class="fa-solid fa-route"></i>
        <div>
          <span>Viaje activo</span>
          <p id="infoViaje">Sin viaje activo</p>
        </div>
        <a href="#/" data-link aria-label="Ver viaje activo">
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>

      <section class="security-command-grid" aria-label="Acciones de seguridad">
        <button class="security-command emergency ripple" data-action="sos" type="button">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Emergencia</span>
          <p>Alertar a BeGO ahora.</p>
        </button>

        <button class="security-command ripple" data-action="compartir" type="button">
          <i class="fa-solid fa-location-dot"></i>
          <span>Compartir viaje</span>
          <p>Enviar seguimiento en vivo.</p>
        </button>

        <button class="security-command ripple" data-action="contacto" type="button">
          <i class="fa-solid fa-user-shield"></i>
          <span>Contacto seguro</span>
          <p>Llamar a tu contacto guardado.</p>
        </button>

        <button class="security-command ripple" id="btnReportar" data-action="reportar" type="button">
          <i class="fa-solid fa-flag"></i>
          <span>Reportar</span>
          <p>Informar un problema.</p>
        </button>
      </section>

      <section class="support-panel security-list-panel">
        <div class="support-section-title">
          <span>Controles del viaje</span>
          <small>Verificación BeGO</small>
        </div>

        <a class="support-list-row ripple" href="#/datos-motorista" data-link>
          <i class="fa-solid fa-id-card"></i>
          <div>
            <span>Datos del motorista</span>
            <p>Identidad, vehículo y placa asignada.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <button class="support-list-row ripple" id="btnAudio" type="button">
          <i class="fa-solid fa-microphone"></i>
          <div>
            <span>Registro de audio</span>
            <p>Guardar evidencia del viaje cuando sea necesario.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </button>

        <a class="support-list-row ripple" href="#/soporte" data-link>
          <i class="fa-solid fa-headset"></i>
          <div>
            <span>Asistencia BeGO</span>
            <p>Hablar con soporte por viaje, pago o cuenta.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>
    </main>
  </div>
  `;
}
