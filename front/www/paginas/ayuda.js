export function renderAyuda() {
  return `
  <div class="css-ayuda">
    <section class="ayuda-container">
      <section class="support-hero ayuda-hero">
        <div>
          <span class="support-kicker">Centre BeGO</span>
          <h1>Aide</h1>
          <p>Trouvez rapidement de l'aide pour vos courses, paiements, compte et securite.</p>
        </div>
        <a class="support-hero-action ripple" href="#/soporte" data-link aria-label="Ouvrir l'assistance">
          <i class="fa-solid fa-headset"></i>
        </a>
      </section>

      <label class="support-search" for="busquedaAyuda">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="search" id="busquedaAyuda" placeholder="Rechercher une aide">
      </label>

      <section class="support-quick-grid" aria-label="Acces rapides">
        <a class="support-action-card featured ripple" href="#/soporte" data-link>
          <i class="fa-solid fa-comments"></i>
          <span>Assistance en direct</span>
          <p>Parlez avec l'equipe BeGO.</p>
        </a>

        <a class="support-action-card ripple" href="#/actividad" data-link>
          <i class="fa-solid fa-route"></i>
          <span>Mes courses</span>
          <p>Historique et etats.</p>
        </a>

        <a class="support-action-card ripple" href="#/seguridad" data-link>
          <i class="fa-solid fa-shield-halved"></i>
          <span>Securite</span>
          <p>Outils pour voyager protege.</p>
        </a>

        <a class="support-action-card ripple" href="#/wallet" data-link>
          <i class="fa-solid fa-wallet"></i>
          <span>Paiements</span>
          <p>Wallet, recharges et solde.</p>
        </a>
      </section>

      <section class="support-panel">
        <div class="support-section-title">
          <span>Questions frequentes</span>
          <small>Reponse rapide</small>
        </div>

        <div class="support-faq-list">
          <details class="support-faq-item">
            <summary>
              <span>Comment annuler une course?</span>
              <i class="fa-solid fa-chevron-down"></i>
            </summary>
            <p>Depuis l'ecran de la course, touchez Annuler avant que la course passe a une etape non annulable.</p>
          </details>

          <details class="support-faq-item">
            <summary>
              <span>Que faire si le conducteur n'arrive pas?</span>
              <i class="fa-solid fa-chevron-down"></i>
            </summary>
            <p>Ouvrez Securite ou Assistance pour signaler le probleme, partager votre course ou demander de l'aide.</p>
          </details>

          <details class="support-faq-item">
            <summary>
              <span>Ou voir mes paiements?</span>
              <i class="fa-solid fa-chevron-down"></i>
            </summary>
            <p>Ouvrez Wallet pour consulter le solde, les mouvements, les recharges et les recus disponibles.</p>
          </details>
        </div>
      </section>
    </section>
  </div>
  `;
}
