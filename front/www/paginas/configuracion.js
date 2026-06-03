export function renderConfiguracion() {
  return `
  <div class="css-config">
    <section class="config-main">
      <section class="config-hero">
        <div>
          <span class="config-kicker">Centre de controle</span>
          <h1>Configuration</h1>
          <p>Gerez votre compte, la securite, la confidentialite et l'experience BeGO.</p>
        </div>
        <a class="config-hero-icon ripple" href="#/cuenta" data-link aria-label="Ouvrir le compte">
          <i class="fa-solid fa-user-shield"></i>
        </a>
      </section>

      <section class="config-profile-card">
        <div class="config-avatar" id="configAvatar">B</div>
        <div>
          <span>Profil actif</span>
          <strong id="configUserName">Invite</strong>
          <p id="configUserMeta">Compte BeGO protege</p>
        </div>
        <a href="#/cuenta" data-link class="config-edit ripple" aria-label="Modifier le profil">
          <i class="fa-solid fa-pen"></i>
        </a>
      </section>

      <section class="config-grid">
        <article class="config-panel">
          <div class="config-section-title">
            <span>Compte</span>
            <small>Identite</small>
          </div>

          <a class="config-row ripple" href="#/cuenta" data-link>
            <i class="fa-solid fa-user"></i>
            <div>
              <span>Modifier le profil</span>
              <p>Nom, photo et informations personnelles.</p>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
          </a>

          <button class="config-row ripple" type="button">
            <i class="fa-solid fa-phone"></i>
            <div>
              <span>Changer le numero</span>
              <p>Actualisez votre telephone de contact.</p>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
          </button>

          <button class="config-row ripple" type="button">
            <i class="fa-solid fa-lock"></i>
            <div>
              <span>Changer le mot de passe</span>
              <p>Renforcez l'acces a votre compte.</p>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </article>

        <article class="config-panel">
          <div class="config-section-title">
            <span>Experience</span>
            <small>App</small>
          </div>

          <label class="config-toggle-row" for="darkMode">
            <i class="fa-solid fa-moon"></i>
            <div>
              <span>Mode sombre</span>
              <p>Interface nocturne BeGO.</p>
            </div>
            <span class="config-switch">
              <input type="checkbox" id="darkMode">
              <span></span>
            </span>
          </label>

          <label class="config-toggle-row" for="simpleMode">
            <i class="fa-solid fa-eye"></i>
            <div>
              <span>Mode simple</span>
              <p>Affichage plus direct et leger.</p>
            </div>
            <span class="config-switch">
              <input type="checkbox" id="simpleMode">
              <span></span>
            </span>
          </label>

          <label class="config-toggle-row" for="notificationsMode">
            <i class="fa-solid fa-bell"></i>
            <div>
              <span>Notifications</span>
              <p>Alertes de course, paiement et securite.</p>
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
          <span>Securite et confidentialite</span>
          <small>Protection</small>
        </div>

        <a class="config-row ripple" href="#/seguridad" data-link>
          <i class="fa-solid fa-shield-halved"></i>
          <div>
            <span>Centre de securite</span>
            <p>Partage de course, SOS et signalements.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <button class="config-row ripple" type="button">
          <i class="fa-solid fa-location-dot"></i>
          <div>
            <span>Partager la position</span>
            <p>Autorisations GPS pour des courses precises.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </button>

        <a class="config-row ripple" href="#/soporte" data-link>
          <i class="fa-solid fa-headset"></i>
          <div>
            <span>Assistance</span>
            <p>Aide pour compte, paiements ou securite.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>

      <button id="logoutBtn" class="config-logout ripple" type="button">
        <i class="fa-solid fa-right-from-bracket"></i>
        <span>Se deconnecter</span>
      </button>
    </section>
  </div>
  `;
}
