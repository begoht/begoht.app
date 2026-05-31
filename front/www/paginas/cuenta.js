export function renderCuenta() {
  return `
  <div class="css-cuenta">
    <main class="cuenta-page">

      <!-- MENU RAPIDO -->
      <section class="menu">

        <button class="ripple" href="#/ayuda" data-link>
          <i class="fa-solid fa-circle-question"></i> Ayuda
        </button>

        <button class="ripple" href="#/seguridad" data-link>
          <i class="fa-solid fa-shield-halved"></i> Seguridad
        </button>

        <button class="ripple" href="#/wallet" data-link>
          <i class="fa-solid fa-wallet"></i> Billetera
        </button>

        <button class="ripple" href="#/soporte" data-link>
          <i class="fa-solid fa-headset"></i> Soporte
        </button>

      </section>

      <!-- PROMOS -->
      <section class="promos-cuenta">

        <a class="ripple promo" href="#/promos" data-link>
          <div class="promo-izq">
            <i class="fa-solid fa-gift"></i>
            <div>
              <span>Probá BeGO sin costo</span>
              <p>Desbloqueá un 15% en créditos</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="ripple promo" href="#/seguridad" data-link>
          <div class="promo-izq">
            <i class="fa-solid fa-shield-halved"></i>
            <div>
              <span>Centro de Seguridad</span>
              <p>Hacé tus viajes más seguros</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

      </section>

      <!-- OPCIONES -->
      <section class="opciones-cuenta">

        <!-- WALLET -->
        <a class="ripple opcion" href="#/wallet" data-link>
          <div class="opcion-izq">
            <i class="fa-solid fa-wallet"></i>
            <div>
              <span>Wallet BeGO</span>
              <p id="saldoWallet">Cargando saldo…</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <!-- FAMILIA -->
        <a class="ripple opcion" id="btnFamilia" data-pro="true" href="#/familia" data-link>
          <div class="opcion-izq">
            <i class="fa-solid fa-people-roof"></i>
            <div>
              <span>Familia PRO</span>
              <p>Administrá cuentas familiares</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <!-- CONFIG -->
        <a class="ripple opcion" href="#/configuracion" data-link>
          <div class="opcion-izq">
            <i class="fa-solid fa-gear"></i>
            <div>
              <span>Configuración</span>
              <p>Personalizá tu experiencia</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <!-- MODO -->
        <div class="ripple opcion" id="modoToggleBtn">
          <div class="opcion-izq">
            <i class="fa-solid fa-eye"></i>
            <div>
              <span id="modoTitulo">Modo simple</span>
              <p id="modoDescripcion">Interfaz simplificada</p>
            </div>
          </div>
          <label class="switch">
            <input type="checkbox" id="modoSwitch">
            <span class="slider"></span>
          </label>
        </div>

        <!-- GANANCIAS -->
        <a class="ripple opcion" href="#/ganancias" data-link id="btnGanancias" data-pro="true">
          <div class="opcion-izq">
            <i class="fa-solid fa-money-bill-trend-up"></i>
            <div>
              <span>Generar ganancias</span>
              <p>Ganá dinero con BeGO</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <!-- LOGOUT -->
        <a class="ripple opcion" id="logoutBtn" href="#">
          <div class="opcion-izq">
            <i class="fa-solid fa-right-from-bracket"></i>
            <div>
              <span>Cerrar sesión</span>
            </div>
          </div>
        </a>

      </section>

    </main>
  </div>
  `;
}
