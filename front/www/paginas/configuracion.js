export function renderConfiguracion() {
  return `
  <div class="css-config">
    <main class="config-main">
      <section class="config-hero">
        <div>
          <span class="config-kicker">Centro de control</span>
          <h1>Configuración</h1>
          <p>Ajusta tu cuenta, seguridad, privacidad y experiencia de uso en BeGO.</p>
        </div>
        <a class="config-hero-icon ripple" href="#/cuenta" data-link aria-label="Abrir cuenta">
          <i class="fa-solid fa-user-shield"></i>
        </a>
      </section>

      <section class="config-profile-card">
        <div class="config-avatar" id="configAvatar">B</div>
        <div>
          <span>Perfil activo</span>
          <strong id="configUserName">Invitado</strong>
          <p id="configUserMeta">Cuenta BeGO protegida</p>
        </div>
        <a href="#/cuenta" data-link class="config-edit ripple" aria-label="Editar perfil">
          <i class="fa-solid fa-pen"></i>
        </a>
      </section>

      <section class="config-grid">
        <article class="config-panel">
          <div class="config-section-title">
            <span>Cuenta</span>
            <small>Identidad</small>
          </div>

          <a class="config-row ripple" href="#/cuenta" data-link>
            <i class="fa-solid fa-user"></i>
            <div>
              <span>Editar perfil</span>
              <p>Nombre, foto y datos personales.</p>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
          </a>

          <button class="config-row ripple" type="button">
            <i class="fa-solid fa-phone"></i>
            <div>
              <span>Cambiar número</span>
              <p>Actualiza tu teléfono de contacto.</p>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
          </button>

          <button class="config-row ripple" type="button">
            <i class="fa-solid fa-lock"></i>
            <div>
              <span>Cambiar contraseña</span>
              <p>Refuerza el acceso a tu cuenta.</p>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </article>

        <article class="config-panel">
          <div class="config-section-title">
            <span>Experiencia</span>
            <small>App</small>
          </div>

          <label class="config-toggle-row" for="darkMode">
            <i class="fa-solid fa-moon"></i>
            <div>
              <span>Modo oscuro</span>
              <p>Apariencia premium nocturna.</p>
            </div>
            <span class="config-switch">
              <input type="checkbox" id="darkMode">
              <span></span>
            </span>
          </label>

          <label class="config-toggle-row" for="simpleMode">
            <i class="fa-solid fa-eye"></i>
            <div>
              <span>Modo simple</span>
              <p>Interfaz más directa y liviana.</p>
            </div>
            <span class="config-switch">
              <input type="checkbox" id="simpleMode">
              <span></span>
            </span>
          </label>

          <label class="config-toggle-row" for="notificationsMode">
            <i class="fa-solid fa-bell"></i>
            <div>
              <span>Notificaciones</span>
              <p>Alertas de viaje, pagos y seguridad.</p>
            </div>
            <span class="config-switch">
              <input type="checkbox" id="notificationsMode" checked>
              <span></span>
            </span>
          </label>
        </article>
      </section>

      <section class="config-panel">
        <div class="config-section-title">
          <span>Seguridad y privacidad</span>
          <small>Protección</small>
        </div>

        <a class="config-row ripple" href="#/seguridad" data-link>
          <i class="fa-solid fa-shield-halved"></i>
          <div>
            <span>Centro de seguridad</span>
            <p>Compartir viaje, SOS y reportes.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <button class="config-row ripple" type="button">
          <i class="fa-solid fa-location-dot"></i>
          <div>
            <span>Compartir ubicación</span>
            <p>Permisos de GPS para viajes precisos.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </button>

        <a class="config-row ripple" href="#/soporte" data-link>
          <i class="fa-solid fa-headset"></i>
          <div>
            <span>Asistencia</span>
            <p>Soporte para cuenta, pagos o seguridad.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>

      <button id="logoutBtn" class="config-logout ripple" type="button">
        <i class="fa-solid fa-right-from-bracket"></i>
        <span>Cerrar sesión</span>
      </button>
    </main>
  </div>
  `;
}
