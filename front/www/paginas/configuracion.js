export function renderConfiguracion() {
  return `
  <div class="css-config">

    <header class="app-header">
      <nav>
        <button class="icon-btn ripple" onclick="history.back()">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <strong>Configuración</strong>
      </nav>
    </header>

    <main class="config-main">

      <!-- CUENTA -->
      <section class="config-section">
        <h3>Cuenta</h3>

        <button class="config-item ripple">
          <i class="fa-solid fa-user"></i>
          <span>Editar perfil</span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>

        <button class="config-item ripple">
          <i class="fa-solid fa-phone"></i>
          <span>Cambiar número</span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>

        <button class="config-item ripple">
          <i class="fa-solid fa-lock"></i>
          <span>Cambiar contraseña</span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </section>

      <!-- APP -->
      <section class="config-section">
        <h3>Aplicación</h3>

        <div class="config-item">
          <i class="fa-solid fa-moon"></i>
          <span>Modo oscuro</span>
          <label class="switch">
            <input type="checkbox" id="darkMode">
            <span class="slider"></span>
          </label>
        </div>

        <div class="config-item">
          <i class="fa-solid fa-eye"></i>
          <span>Modo simple</span>
          <label class="switch">
            <input type="checkbox" id="simpleMode">
            <span class="slider"></span>
          </label>
        </div>

        <div class="config-item">
          <i class="fa-solid fa-bell"></i>
          <span>Notificaciones</span>
          <label class="switch">
            <input type="checkbox" checked>
            <span class="slider"></span>
          </label>
        </div>
      </section>

      <!-- SEGURIDAD -->
      <section class="config-section">
        <h3>Seguridad</h3>

        <button class="config-item ripple">
          <i class="fa-solid fa-shield-halved"></i>
          <span>Centro de seguridad</span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>

        <button class="config-item ripple">
          <i class="fa-solid fa-location-dot"></i>
          <span>Compartir ubicación</span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>

        <button id="logoutBtn" class="config-item ripple">
          <i class="fa-solid fa-right-from-bracket"></i> 
          <span>Cerrar sesión</span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>

      </section>

    </main>
  </div>
  `;
}