export function renderWallet() {
  return `
  <div class="view-wallet-context">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>

    <div class="wallet-view">
      <div class="app-container">

        <header class="main-header">
          <button class="header-btn" type="button" data-action="copiar-alias">
            <i class="fa-solid fa-copy"></i>
            <span id="walletAliasLabel">Alias</span>
          </button>

          <div class="header-right">
            <button class="header-btn" type="button" data-action="abrir-ayuda">
              <i class="fa-regular fa-circle-question"></i> Aide
            </button>
            <button class="notification-icon" type="button" data-action="abrir-movimientos" aria-label="Mouvements wallet">
              <i class="fa-regular fa-bell"></i>
              <span class="badge" id="walletMovBadge">0</span>
            </button>
          </div>

          <div class="security-pill">
            <button class="btn-secure" id="btnWalletSecurity" type="button" data-action="abrir-config-pin" aria-label="Securite wallet">
              <i class="fa-solid fa-shield-halved"></i>
              <span id="walletPinStatus">PIN</span>
            </button>
          </div>
        </header>

        <section class="balance-card">
          <div class="premium-glow"></div>
          <div class="balance-header">
            <div class="balance-label">
              Wallet BeGO <span class="trend" id="walletSecureState">Protegee</span>
            </div>
            <button class="view-history" id="btnMovimientos" type="button" data-action="abrir-movimientos">
              Mouvements <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <div class="balance-main">
            <span class="currency">HTG</span>
            <span id="saldoWallet" class="amount">***.**</span>
            <button class="toggle-visibility" type="button" aria-label="Afficher ou masquer le solde">
              <i class="fa-regular fa-eye-slash"></i>
            </button>
          </div>

          <div class="balance-footer">
            <div>
              <small>Disponible maintenant</small>
              <strong id="walletAvailableLabel">HTG</strong>
            </div>
            <div>
              <small>Reserve voyages</small>
              <strong id="walletBlockedLabel">0.00</strong>
            </div>
          </div>
        </section>

        <section class="wallet-insights">
          <div class="insight-item">
            <i class="fa-solid fa-lock"></i>
            <span>Escrow voyages</span>
          </div>
          <div class="insight-item">
            <i class="fa-solid fa-fingerprint"></i>
            <span>PIN requis</span>
          </div>
          <div class="insight-item">
            <i class="fa-solid fa-receipt"></i>
            <span>Recu verifiable</span>
          </div>
        </section>

        <section class="action-grid">
          <button class="action-item" type="button" data-action="recargar">
            <div class="icon-box"><i class="fa-solid fa-arrow-down"></i></div>
            <span>Recharger</span>
          </button>

          <button class="action-item" type="button" id="btnEnviar">
            <div class="icon-box"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
            <span>Envoyer</span>
          </button>

          <button class="action-item" type="button" data-action="retirar">
            <div class="icon-box"><i class="fa-solid fa-arrow-up"></i></div>
            <span>Retirer</span>
          </button>
        </section>

        <section class="wallet-mini-history" aria-live="polite">
          <div class="wallet-section-title">
            <span>Derniers mouvements</span>
            <button type="button" data-action="abrir-movimientos">Tout voir</button>
          </div>
          <div id="listaMovimientos" class="wallet-history-list"></div>
        </section>
      </div>

      <div id="modalSelectSendType" class="modal-bottom">
        <div class="modal-bottom-content animate-slide-up">
          <div class="modal-header-simple">
            <button data-action="cerrar-modal-send" type="button" class="btn-back">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <h2>Envoyer de l'argent</h2>
          </div>

          <p class="select-title">Choisissez le destinataire</p>

          <div class="send-options">
            <button class="option-item" type="button" data-action="buscar-telefono">
              <div class="option-icon bg-red"><i class="fa-solid fa-mobile-screen"></i></div>
              <div class="option-text">
                <span>Avec numero de telephone</span>
                <i class="fa-solid fa-chevron-right"></i>
              </div>
            </button>

            <button class="option-item" type="button" data-action="buscar-alias">
              <div class="option-icon bg-blue"><i class="fa-solid fa-user"></i></div>
              <div class="option-text">
                <span>Avec alias BeGO</span>
                <i class="fa-solid fa-chevron-right"></i>
              </div>
            </button>
          </div>

          <div class="favorites-section">
            <p class="fav-label">SECURITE</p>
            <div class="fav-empty-card">
              <p>Chaque envoi exige votre <strong>PIN personnel.</strong></p>
              <div class="fav-illustration"><i class="fa-solid fa-shield-halved"></i></div>
            </div>
          </div>
        </div>
      </div>

      <div id="modalBuscarDestinatario" class="modal hidden">
        <div class="modal-content">
          <h3 id="buscarTitulo">Destinataire</h3>
          <p class="wallet-modal-copy" id="buscarCopy">Entrez un alias BeGO.</p>

          <div class="input-container">
            <input type="text" id="inputBusqueda" autocomplete="off" placeholder="ex: bego1234" />
          </div>

          <div class="modal-actions">
            <button id="btnProcesarBusqueda" class="btn-primary" type="button" data-action="procesar-busqueda">Continuer</button>
            <button data-action="cerrar-busqueda" class="btn-secondary" type="button">Annuler</button>
          </div>
        </div>
      </div>

      <div id="modalConfirmTransfer" class="modal hidden">
        <div class="modal-content">
          <img id="destFoto" src="/img/default-avatar.png" alt="Destinataire" />
          <h3 id="destNombre">Nom</h3>
          <p id="destAlias">@alias</p>

          <p class="saldo-disponible">
            Solde disponible: <strong id="saldoDisponibleModal">HTG 0.00</strong>
          </p>

          <div class="input-container">
            <label>Montant a envoyer</label>
            <div class="wallet-amount-input">
              <span>HTG</span>
              <input type="number" id="destMonto" inputmode="decimal" min="1" step="0.01" placeholder="0.00" />
            </div>
          </div>

          <div class="pin-container">
            <label>PIN wallet</label>
            <input type="password" id="destPin" maxlength="4" inputmode="numeric" autocomplete="one-time-code" placeholder="----"/>
          </div>

          <p id="transferError" class="pin-error oculto"></p>

          <div class="modal-actions">
            <button id="confirmTransfer" type="button" data-action="confirmar-transferencia">
              <span id="btnText">Confirmer</span>
              <i id="btnSpinner" class="fa-solid fa-circle-notch fa-spin oculto"></i>
            </button>
            <button id="cancelTransfer" type="button" data-action="cancelar-transferencia">Annuler</button>
          </div>
        </div>
      </div>

      <div id="modalMovimientosWallet" class="modal hidden">
        <div class="modal-content wallet-movements-modal">
          <div class="modal-header-simple">
            <h2>Mouvements wallet</h2>
            <button type="button" class="btn-back" data-action="cerrar-movimientos"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div id="listaMovimientosModal" class="wallet-history-list"></div>
        </div>
      </div>

      <div id="modalRetiroWallet" class="modal hidden">
        <div class="modal-content">
          <div class="wallet-disabled-icon"><i class="fa-solid fa-building-columns"></i></div>
          <h3>Retraits bientot disponibles</h3>
          <p class="wallet-modal-copy">MonCash et NatCash ne sont pas disponibles pour le moment. Votre solde reste protege dans Wallet BeGO.</p>
          <div class="modal-actions">
            <button type="button" data-action="cerrar-retiro">Compris</button>
          </div>
        </div>
      </div>

      <div id="modalPin" class="modal hidden">
        <div class="modal-content">
          <h3 class="modal-title">Configurer le PIN de securite</h3>
          <p class="wallet-modal-copy">Utilisez un code de 4 chiffres difficile a deviner.</p>

          <div class="pin-container">
            <label>Nouveau PIN</label>
            <input type="password" id="nuevoPin" maxlength="4" inputmode="numeric" autocomplete="new-password" placeholder="----"/>
            <small id="pinConfigError" class="pin-error oculto"></small>
          </div>

          <div class="modal-actions">
            <button id="btnGuardarPin" type="button">Enregistrer</button>
            <button id="btnCerrarPin" type="button">Annuler</button>
          </div>
        </div>
      </div>

      <div id="modalCambiarPin" class="modal hidden">
        <div class="modal-content">
          <h3 class="modal-title">Changer le PIN</h3>

          <div class="pin-container">
            <label>PIN actuel</label>
            <input type="password" id="pinActual" maxlength="4" inputmode="numeric" autocomplete="current-password"/>
          </div>

          <div class="pin-container">
            <label>Nouveau PIN</label>
            <input type="password" id="nuevoPinCambio" maxlength="4" inputmode="numeric" autocomplete="new-password"/>
            <small id="pinCambioError" class="pin-error oculto"></small>
          </div>

          <div class="modal-actions">
            <button id="btnActualizarPin" type="button">Mettre a jour</button>
            <button id="btnCerrarCambiarPin" type="button">Annuler</button>
          </div>
        </div>
      </div>

      <div id="walletToast" class="wallet-toast hidden" role="status" aria-live="polite"></div>
    </div>
  </div>
  `;
}
