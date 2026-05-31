export function renderSeguridad() {
  return `
  <div class="css-seguridad">

    <header class="app-header">
      <nav>
        <div class="header-izq">
          <button class="icon-btn ripple" id="btnBack">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <strong>Centro de Seguridad</strong>
        </div>
      </nav>
    </header>

    <main class="seguridad">

      <!-- VIAJE ACTIVO -->
      <section id="viajeActivoBox" class="seguridad-card">
        <i class="fa-solid fa-route"></i>
        <div>
          <span>Viaje activo</span>
          <p id="infoViaje">—</p>
        </div>
      </section>

      <!-- EMERGENCIA -->
      <section class="seguridad-card emergencia">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <h3>Emergencia</h3>
          <p>Llamá rápidamente a BeGO</p>
        </div>
        <button class="btn-emergencia ripple" id="btnSOS">
          SOS
        </button>
      </section>

      <!-- COMPARTIR -->
      <button class="seguridad-card ripple" id="btnCompartir">
        <i class="fa-solid fa-location-dot"></i>
        <div>
          <span>Compartir viaje en tiempo real</span>
          <p>Compartí tu recorrido con alguien de confianza</p>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </button>

      <!-- CONTACTOS -->
      <button class="seguridad-card ripple" id="btnContacto">
        <i class="fa-solid fa-user-shield"></i>
        <div>
          <span>Contactos de confianza</span>
          <p>Llamar a contacto de emergencia</p>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </button>

      <!-- MOTORISTA -->
      <a class="seguridad-card ripple" href="#/datos-motorista" data-link>
        <i class="fa-solid fa-id-card"></i>
        <div>
          <span>Datos del motorista</span>
          <p>Identidad y vehículo asignado</p>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </a>

      <!-- AUDIO -->
      <button class="seguridad-card ripple" id="btnAudio">
        <i class="fa-solid fa-microphone"></i>
        <div>
          <span>Grabación de audio</span>
          <p>Guardá evidencia del viaje</p>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </button>

      <!-- REPORTAR -->
      <button class="seguridad-card ripple" id="btnReportar">
        <i class="fa-solid fa-flag"></i>
        <div>
          <span>Reportar un problema</span>
          <p>Denunciá situaciones inseguras</p>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </button>

    </main>
  </div>
  `;
}