export function renderWallet() {
  return `
  <div class="view-wallet-context">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>

  <div class="wallet-view">
    <div class="app-container">

      <header class="main-header">
        <button class="header-btn"><i class="fa-solid fa-copy"></i> Alias</button>

        <div class="header-right">
          <button class="header-btn"><i class="fa-regular fa-circle-question"></i> Ayuda</button>
          <div class="notification-icon">
            <i class="fa-regular fa-bell"></i>
            <span class="badge">1</span>
          </div>
        </div>

        <div class="security-pill">
          <button class="btn-secure" id="btnCambiarPin" aria-label="Seguridad">
            🔐
          </button>
        </div>
      </header>

      <!-- BALANCE -->
      <section class="balance-card">
        <div class="premium-glow"></div>
        <div class="balance-header">
          <div class="balance-label">
            Disponible <span class="trend">↑ 25,10%</span>
          </div>
          <button class="view-history" id="btnMovimientos">
            Movimientos <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div class="balance-main">
          <span class="currency">$</span>
          <span id="saldoWallet" class="amount">***.***.***</span>
          <button class="toggle-visibility">
            <i class="fa-regular fa-eye-slash"></i>
          </button>
        </div>

        <div class="balance-footer">
          <div>
            <small>Disponible ahora</small>
            <strong>HTG</strong>
          </div>
          <div>
            <small>PIN + antifraude</small>
            <strong>Activo</strong>
          </div>
        </div>
      </section>

      <section class="wallet-insights">
        <div class="insight-item">
          <i class="fa-solid fa-lock"></i>
          <span>Escrow en viajes</span>
        </div>
        <div class="insight-item">
          <i class="fa-solid fa-fingerprint"></i>
          <span>PIN requerido</span>
        </div>
        <div class="insight-item">
          <i class="fa-solid fa-receipt"></i>
          <span>Recibos verificables</span>
        </div>
      </section>

      <!-- MODAL ENVIAR -->
      <div id="modalSelectSendType" class="modal-bottom">
        <div class="modal-bottom-content animate-slide-up">

          <div class="modal-header-simple">
            <button data-action="cerrar-modal-send" class="btn-back">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <h2>Enviar dinero</h2>
          </div>

          <p class="select-title">¿Cómo querés enviar dinero?</p>

          <div class="send-options">
            <button class="option-item" data-action="buscar-telefono">
              <div class="option-icon bg-red">
                <i class="fa-solid fa-mobile-screen"></i>
              </div>
              <div class="option-text">
                <span>Con número de teléfono</span>
                <i class="fa-solid fa-chevron-right"></i>
              </div>
            </button>

            <button class="option-item" data-action="buscar-alias">
              <div class="option-icon bg-blue">
                <i class="fa-solid fa-user"></i>
              </div>
              <div class="option-text">
                <span>Con alias, CBU o CVU</span>
                <i class="fa-solid fa-chevron-right"></i>
              </div>
            </button>
          </div>

          <div class="favorites-section">
            <p class="fav-label">TUS FAVORITOS</p>
            <div class="fav-empty-card">
              <p>Acá vas a ver tus <br><strong>contactos favoritos.</strong></p>
              <div class="fav-illustration">
                <i class="fa-solid fa-address-book"></i>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- BUSCAR DESTINATARIO -->
      <div id="modalBuscarDestinatario" class="modal hidden">
        <div class="modal-content">
          <h3 id="buscarTitulo">Enviar con Alias/CBU</h3>

          <div class="input-container">
            <input type="text" id="inputBusqueda" placeholder="Ej: tyler.moto o 00000..." />
          </div>

          <div class="modal-actions">
            <button id="btnProcesarBusqueda" class="btn-primary">Continuar</button>
            <button data-action="cerrar-busqueda" class="btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- CONFIRMAR TRANSFER -->
      <div id="modalConfirmTransfer" class="modal hidden">
        <div class="modal-content">
          <img id="destFoto" src="/img/default-avatar.png" alt="Foto" />
          <h3 id="destNombre">Nombre Apellido</h3>
          <p id="destAlias">@alias</p>

          <p class="saldo-disponible">
            Saldo disponible: <strong id="saldoDisponibleModal">$0.00</strong>
          </p>

          <div class="input-container">
            <label>Monto a enviar</label>
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
              <span style="font-size:24px;font-weight:800;color:var(--secondary);">$</span>
              <input type="number" id="destMonto" placeholder="0.00" step="0.01" />
            </div>
          </div>

          <div class="pin-container">
            <label>Ingresa tu PIN</label>
            <input type="password" id="destPin" maxlength="4" placeholder="••••"/>
          </div>

          <div class="modal-actions">
            <button id="confirmTransfer">
              <span id="btnText">Confirmar Envío</span>
              <i id="btnSpinner" class="fa-solid fa-circle-notch fa-spin oculto"></i>
            </button>
            <button id="cancelTransfer">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- ACCIONES -->
      <section class="action-grid">
        <button class="action-item" data-action="recargar">
          <div class="icon-box"><i class="fa-solid fa-arrow-down"></i></div>
          <span>Recargar</span>
        </button>

        <button class="action-item" id="btnEnviar">
          <div class="icon-box">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </div>
          <span>Enviar</span>
        </button>

        <button class="action-item">
          <div class="icon-box"><i class="fa-solid fa-arrow-up"></i></div>
          <span>Retirar</span>
        </button>
      </section>

    </div>

    <!-- MODAL PIN -->
    <div id="modalPin" class="modal hidden">
      <div class="modal-content">
        <h3 class="modal-title">Configurar PIN de Seguridad</h3>

        <div class="pin-container">
          <label>Nuevo PIN</label>
          <input type="password" id="nuevoPin" maxlength="4" placeholder="••••"/>
          <small id="pinConfigError" class="pin-error oculto"></small>
        </div>

        <div class="modal-actions">
          <button id="btnGuardarPin">Guardar PIN</button>
        </div>
      </div>
    </div>

    <!-- CAMBIAR PIN -->
    <div id="modalCambiarPin" class="modal hidden">
      <div class="modal-content">

        <h3 class="modal-title">Cambiar PIN</h3>

        <div class="pin-container">
          <label>PIN actual</label>
          <input type="password" id="pinActual" maxlength="4"/>
        </div>

        <div class="pin-container">
          <label>Nuevo PIN</label>
          <input type="password" id="nuevoPinCambio" maxlength="4"/>
          <small id="pinCambioError" class="pin-error oculto"></small>
        </div>

        <div class="modal-actions">
          <button id="btnCambiarPin">Actualizar PIN</button>
          <button id="btnCerrarPin">Cancelar</button>
        </div>

      </div>
    </div>

  </div>
  </div>
  `;
}
