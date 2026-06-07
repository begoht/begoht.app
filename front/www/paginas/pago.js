export function renderPago() {
  return `
    <section class="payments-page-shell">
      <section class="payments-hero" aria-labelledby="paymentsTitle">
        <div>
          <span class="payments-kicker">BeGO Paiements</span>
          <h1 id="paymentsTitle">Moyens de paiement</h1>
          <p>Associez vos comptes MonCash et NatCash reels, gardez Wallet BeGO comme solde securise et controlez le moyen par defaut.</p>
        </div>
        <a class="payments-wallet-link ripple" href="#/wallet" data-link>
          <i class="fa-solid fa-wallet"></i>
          <span>Wallet BeGO</span>
        </a>
      </section>

      <section class="payments-summary" aria-label="Resume des paiements">
        <article>
          <i class="fa-solid fa-shield-halved"></i>
          <span>Securite</span>
          <strong>Donnees masquees</strong>
        </article>
        <article>
          <i class="fa-solid fa-mobile-screen"></i>
          <span>Mobile money</span>
          <strong id="paymentLinkedCount">0 associe</strong>
        </article>
        <article>
          <i class="fa-solid fa-bolt"></i>
          <span>Usage</span>
          <strong>Production</strong>
        </article>
        <article>
          <i class="fa-solid fa-lock"></i>
          <span>Controle</span>
          <strong>Par defaut</strong>
        </article>
      </section>

      <section class="payments-provider-grid" aria-label="Comptes mobile money">
        <article class="payment-provider-card" data-provider-card="moncash">
          <div class="payment-provider-top">
            <div class="payment-provider-icon moncash"><i class="fa-solid fa-mobile-screen-button"></i></div>
            <div>
              <span>Compte mobile</span>
              <h2>MonCash</h2>
            </div>
          </div>
          <p>Associez le numero MonCash que vous utilisez vraiment pour les paiements BeGO.</p>
          <div class="payment-method-state" id="paymentStateMoncash">Chargement...</div>
          <div class="payment-provider-actions">
            <button class="payment-primary ripple" type="button" data-payment-link="moncash">
              <i class="fa-solid fa-link"></i>
              <span>Associer</span>
            </button>
            <button class="payment-secondary ripple" type="button" data-payment-default="moncash" disabled>
              <i class="fa-solid fa-star"></i>
              <span>Defaut</span>
            </button>
          </div>
        </article>

        <article class="payment-provider-card" data-provider-card="natcash">
          <div class="payment-provider-top">
            <div class="payment-provider-icon natcash"><i class="fa-solid fa-building-columns"></i></div>
            <div>
              <span>Compte bancaire mobile</span>
              <h2>NatCash</h2>
            </div>
          </div>
          <p>Gardez votre compte NatCash associe pour les paiements et la reconciliation BeGO.</p>
          <div class="payment-method-state" id="paymentStateNatcash">Chargement...</div>
          <div class="payment-provider-actions">
            <button class="payment-primary ripple" type="button" data-payment-link="natcash">
              <i class="fa-solid fa-link"></i>
              <span>Associer</span>
            </button>
            <button class="payment-secondary ripple" type="button" data-payment-default="natcash" disabled>
              <i class="fa-solid fa-star"></i>
              <span>Defaut</span>
            </button>
          </div>
        </article>
      </section>

      <section class="payments-status-panel" aria-live="polite">
        <div class="payments-status-copy">
          <span>Etat fournisseur</span>
          <strong>Association active, debit reel protege</strong>
          <p>Les comptes sont sauvegardes de facon securisee. Les debits reels restent controles par le backend et les cles officielles du fournisseur.</p>
        </div>
        <div id="paymentProviderStatus" class="payments-provider-status"></div>
      </section>

      <section class="payments-method-list" aria-label="Comptes associes">
        <div class="payments-section-head">
          <span>Associes</span>
          <h2>Vos comptes</h2>
        </div>
        <div id="paymentMethodsList" class="payment-methods-list">
          <div class="payment-empty">Chargement des comptes...</div>
        </div>
      </section>

      <div id="paymentModal" class="payment-modal hidden" role="dialog" aria-modal="true" aria-labelledby="paymentModalTitle">
        <div class="payment-modal-card">
          <button class="payment-modal-close" type="button" data-payment-close aria-label="Fermer">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <span class="payments-kicker" id="paymentModalKicker">Mobile money</span>
          <h2 id="paymentModalTitle">Associer un compte</h2>
          <p id="paymentModalCopy">Entrez le numero haitien de 8 chiffres lie au compte.</p>

          <label class="payment-field">
            <span>Nom du compte</span>
            <input id="paymentAccountName" type="text" maxlength="80" autocomplete="name" placeholder="Ex: Jean Pierre">
          </label>

          <label class="payment-field">
            <span>Numero mobile</span>
            <input id="paymentPhone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="Ex: 37123456">
          </label>

          <label class="payment-check">
            <input id="paymentConfirmOwner" type="checkbox">
            <span>Je confirme que ce compte m'appartient et que BeGO peut l'utiliser pour les operations autorisees.</span>
          </label>

          <p id="paymentFormError" class="payment-form-error"></p>

          <button class="payment-submit ripple" type="button" id="paymentSubmit">
            <i class="fa-solid fa-shield-check"></i>
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      <div id="paymentToast" class="payment-toast hidden" role="status" aria-live="polite"></div>
    </section>
  `;
}
