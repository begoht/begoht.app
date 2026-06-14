export function renderGanancias() {
  return `
    <main class="ganancias">
      <section class="ganancias-hero" aria-labelledby="gananciasTitulo">
        <div class="ganancias-hero-copy">
          <span class="ganancias-kicker">Partenaire BeGO</span>
          <h1 id="gananciasTitulo">Generez avec BeGO</h1>
          <p>Transformez votre temps, votre moto et votre reseau en revenus suivis depuis une experience claire et securisee.</p>
        </div>

        <div class="ganancias-hero-panel" aria-label="Resume des opportunites">
          <span>3 voies actives</span>
          <strong>Courses, colis et parrainage</strong>
          <small>Paiements suivis dans Wallet BeGO</small>
        </div>
      </section>

      <section class="ganancias-metrics" aria-label="Avantages rapides">
        <article>
          <i class="fa-solid fa-shield-halved"></i>
          <span>Verification</span>
          <strong>Profil protege</strong>
        </article>
        <article>
          <i class="fa-solid fa-wallet"></i>
          <span>Paiement</span>
          <strong>Wallet BeGO</strong>
        </article>
        <article>
          <i class="fa-solid fa-route"></i>
          <span>Activite</span>
          <strong>Suivi clair</strong>
        </article>
        <article>
          <i class="fa-solid fa-headset"></i>
          <span>Support</span>
          <strong>Assistance</strong>
        </article>
      </section>

      <section class="ganancias-feature" aria-label="Devenir chauffeur">
        <div class="ganancias-feature-icon" aria-hidden="true">
          <i class="fa-solid fa-motorcycle"></i>
        </div>
        <div class="ganancias-feature-copy">
          <span>Option principale</span>
          <h2>Devenir chauffeur BeGO</h2>
          <p>Recevez des courses, suivez vos revenus et construisez votre historique professionnel dans l'app chauffeur.</p>
          <ul>
            <li><i class="fa-solid fa-check"></i> Documents et moto verifies</li>
            <li><i class="fa-solid fa-check"></i> Offres en temps reel</li>
            <li><i class="fa-solid fa-check"></i> Wallet et commissions visibles</li>
          </ul>
        </div>
        <div class="ganancias-feature-actions">
          <button class="ganancias-primary ripple" type="button" id="btnMotorista">
            <i class="fa-solid fa-arrow-right"></i>
            <span>Commencer</span>
          </button>
          <a class="ganancias-secondary ripple" href="https://bego.com.ht/download/bego-motorista.apk?v=20260614-prod-hardening-apk" download>
            <i class="fa-solid fa-download"></i>
            <span>App chauffeur</span>
          </a>
        </div>
      </section>

      <section class="ganancias-opciones" aria-label="Autres facons de gagner">
        <article class="ganancia-card ganancia-card-envio">
          <div class="ganancia-card-top">
            <i class="fa-solid fa-box"></i>
            <span>Colis</span>
          </div>
          <h3>Livraisons jusqu'a 5 kg</h3>
          <p>Activez le service colis depuis la carte et confirmez chaque livraison avec un code securise.</p>
          <button class="ganancias-card-action ripple" type="button" id="btnEnvios">
            <i class="fa-solid fa-map-location-dot"></i>
            <span>Ouvrir la carte</span>
          </button>
        </article>

        <article class="ganancia-card ganancia-card-referidos">
          <div class="ganancia-card-top">
            <i class="fa-solid fa-user-group"></i>
            <span>Parrainage</span>
          </div>
          <h3>Invitez votre reseau</h3>
          <p>Partagez votre code BeGO et gardez vos invitations pretes pour les campagnes actives.</p>
          <div class="ganancias-code" aria-label="Code de parrainage">
            <strong id="codigoReferido">BEGO</strong>
            <button type="button" id="btnCopiarCodigo" aria-label="Copier le code">
              <i class="fa-solid fa-copy"></i>
            </button>
          </div>
          <button class="ganancias-card-action ripple" type="button" id="btnReferidos">
            <i class="fa-solid fa-share-nodes"></i>
            <span>Partager</span>
          </button>
        </article>
      </section>

      <section class="ganancias-steps" aria-label="Processus">
        <div class="ganancias-section-head">
          <span>Processus</span>
          <h2>Du profil au premier revenu</h2>
        </div>

        <article>
          <span>1</span>
          <div>
            <strong>Inscription</strong>
            <p>Creez ou ouvrez votre compte chauffeur BeGO.</p>
          </div>
        </article>
        <article>
          <span>2</span>
          <div>
            <strong>Verification</strong>
            <p>Ajoutez les informations du vehicule et les documents requis.</p>
          </div>
        </article>
        <article>
          <span>3</span>
          <div>
            <strong>Activation</strong>
            <p>Connectez-vous en ligne et recevez les offres disponibles.</p>
          </div>
        </article>
      </section>
    </main>
  `;
}
