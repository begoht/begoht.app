export function renderCuenta() {
  return `
  <div class="css-cuenta">
    <main class="cuenta-page">

      <section class="cuenta-hero">
        <div class="cuenta-avatar" id="cuentaIniciales">B</div>
        <div class="cuenta-identidad">
          <span>Cuenta personal</span>
          <strong id="nombreCuentaUsuario">Invitado</strong>
          <p id="aliasCuentaUsuario">Perfil BeGO</p>
        </div>
        <a class="cuenta-edit ripple" href="#/configuracion" data-link aria-label="Editar cuenta" title="Editar cuenta">
          <i class="fa-solid fa-pen"></i>
        </a>
      </section>

      <section class="menu">
        <a class="ripple" href="#/ayuda" data-link>
          <i class="fa-solid fa-circle-question"></i>
          <span>Ayuda</span>
        </a>

        <a class="ripple" href="#/seguridad" data-link>
          <i class="fa-solid fa-shield-halved"></i>
          <span>Seguridad</span>
        </a>

        <a class="ripple" href="#/wallet" data-link>
          <i class="fa-solid fa-wallet"></i>
          <span>Billetera</span>
        </a>

        <a class="ripple" href="#/soporte" data-link>
          <i class="fa-solid fa-headset"></i>
          <span>Soporte</span>
        </a>

      </section>

      <section class="promos-cuenta">
        <a class="ripple promo" href="#/promos" data-link>
          <div class="promo-izq">
            <i class="fa-solid fa-gift"></i>
            <div>
              <span>Proba BeGO sin costo</span>
              <p>Desbloquea un 15% en creditos</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="ripple promo" href="#/seguridad" data-link>
          <div class="promo-izq">
            <i class="fa-solid fa-shield-halved"></i>
            <div>
              <span>Centro de Seguridad</span>
              <p>Viajes mas seguros y acompanados</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>

      <section class="opciones-cuenta">
        <a class="ripple opcion" href="#/wallet" data-link>
          <div class="opcion-izq">
            <i class="fa-solid fa-wallet"></i>
            <div>
              <span>Wallet BeGO</span>
              <p id="saldoWallet">Cargando saldo...</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="ripple opcion" id="btnFamilia" data-pro="true" href="#/familia" data-link>
          <div class="opcion-izq">
            <i class="fa-solid fa-people-roof"></i>
            <div>
              <span>Familia PRO</span>
              <p>Administra cuentas familiares</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="ripple opcion" href="#/configuracion" data-link>
          <div class="opcion-izq">
            <i class="fa-solid fa-gear"></i>
            <div>
              <span>Configuracion</span>
              <p>Personaliza tu experiencia</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="ripple opcion" href="#/legal-confianza" data-link>
          <div class="opcion-izq">
            <i class="fa-solid fa-shield-heart"></i>
            <div>
              <span>Legal et confiance</span>
              <p>Termes, confidentialite et regles des colis</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

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

        <a class="ripple opcion" href="#/ganancias" data-link id="btnGanancias" data-pro="true">
          <div class="opcion-izq">
            <i class="fa-solid fa-money-bill-trend-up"></i>
            <div>
              <span>Generar ganancias</span>
              <p>Gana dinero con BeGO</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="ripple opcion" id="logoutBtn" href="#">
          <div class="opcion-izq">
            <i class="fa-solid fa-right-from-bracket"></i>
            <div>
              <span>Cerrar sesion</span>
              <p>Salir de este dispositivo</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>

    </main>
  </div>
  `;
}
