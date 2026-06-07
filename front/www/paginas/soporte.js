export function renderSoporte() {
  return `
  <div class="css-soporte">
    <section class="soporte-container">
      <section class="support-hero soporte-hero">
        <div>
          <span class="support-kicker">Assistance BeGO</span>
          <h1>Support</h1>
          <p>Recevez de l'aide pour vos courses, paiements, securite et compte selon votre situation.</p>
        </div>
        <a class="support-hero-action ripple" href="#/seguridad" data-link aria-label="Ouvrir la securite">
          <i class="fa-solid fa-shield-halved"></i>
        </a>
      </section>

      <label class="support-search" for="soporteBusqueda">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input id="soporteBusqueda" type="search" placeholder="Rechercher une assistance">
      </label>

      <section class="support-priority-card">
        <div>
          <span>Priorite elevee</span>
          <strong>Course en cours</strong>
          <p>Utilisez Securite pour partager votre position, signaler ou envoyer une alerte.</p>
        </div>
        <a class="ripple" href="#/seguridad" data-link aria-label="Ouvrir securite">
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      </section>

      <section class="support-quick-grid" aria-label="Canaux d'assistance">
        <a class="support-action-card featured ripple" href="paginas/soporte-chat.html?v=20260604-live-support">
          <i class="fa-solid fa-comments"></i>
          <span>Chat en direct</span>
          <p>Parler avec l'equipe.</p>
        </a>

        <a class="support-action-card ripple" href="#/actividad" data-link>
          <i class="fa-solid fa-receipt"></i>
          <span>Courses et recus</span>
          <p>Verifier un trajet ou un recu.</p>
        </a>

        <a class="support-action-card ripple" href="#/wallet" data-link>
          <i class="fa-solid fa-wallet"></i>
          <span>Paiements</span>
          <p>Wallet, solde ou recharge.</p>
        </a>

        <a class="support-action-card ripple" href="#/cuenta" data-link>
          <i class="fa-solid fa-user-shield"></i>
          <span>Compte</span>
          <p>Profil, acces et securite.</p>
        </a>

      </section>

      <section class="support-panel">
        <div class="support-section-title">
          <span>Themes frequents</span>
          <small>Production</small>
        </div>

        <a class="support-list-row ripple" href="#/actividad" data-link>
          <i class="fa-solid fa-circle-exclamation"></i>
          <div>
            <span>Probleme avec une course</span>
            <p>Consultez l'activite et ouvrez le detail correspondant.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="support-list-row ripple" href="#/wallet" data-link>
          <i class="fa-solid fa-credit-card"></i>
          <div>
            <span>Paiement ou solde</span>
            <p>Verifiez les mouvements avant de creer une demande.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="support-list-row ripple" href="#/ayuda" data-link>
          <i class="fa-solid fa-book-open"></i>
          <div>
            <span>Guide d'utilisation</span>
            <p>Questions rapides sur BeGO.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="support-list-row ripple" href="#/legal-confianza" data-link>
          <i class="fa-solid fa-box"></i>
          <div>
            <span>Regles des colis</span>
            <p>Maximum 5 kg, objets interdits et code de livraison.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>
    </section>
  </div>
  `;
}
