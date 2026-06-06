const LAST_UPDATED = "6 juin 2026";

function contactCards({ publicMode = false } = {}) {
  const supportHref = publicMode ? "registro.html" : "#/soporte";
  const supportAttrs = publicMode ? "" : "data-link";

  return `
    <section class="legal-contact-grid" aria-label="Contact officiel BeGO">
      <a class="legal-contact-card featured ripple" href="${supportHref}" ${supportAttrs}>
        <i class="fa-solid fa-comments"></i>
        <span>Chat en direct</span>
        <p>Assistance depuis l'app pour course, paiement, compte ou colis.</p>
      </a>
      <a class="legal-contact-card ripple" href="mailto:support@bego.com.ht">
        <i class="fa-solid fa-envelope"></i>
        <span>support@bego.com.ht</span>
        <p>Contact officiel pour demandes formelles et documents.</p>
      </a>
      <a class="legal-contact-card ripple" href="https://www.facebook.com/search/top?q=bego%20haiti" target="_blank" rel="noopener">
        <i class="fa-brands fa-facebook-f"></i>
        <span>BeGO Haiti</span>
        <p>Canal social officiel.</p>
      </a>
      <a class="legal-contact-card ripple" href="https://www.instagram.com/bego.haiti" target="_blank" rel="noopener">
        <i class="fa-brands fa-instagram"></i>
        <span>@bego.haiti</span>
        <p>Actualites et annonces.</p>
      </a>
      <a class="legal-contact-card ripple" href="https://www.tiktok.com/@bego.ht" target="_blank" rel="noopener">
        <i class="fa-brands fa-tiktok"></i>
        <span>@bego.ht</span>
        <p>Communications publiques BeGO.</p>
      </a>
    </section>
  `;
}

export function renderLegalConfianza({ publicMode = false } = {}) {
  const backHref = publicMode ? "registro.html" : "#/configuracion";
  const backAttrs = publicMode ? "" : "data-link";
  const supportHref = publicMode ? "registro.html" : "#/soporte";
  const supportAttrs = publicMode ? "" : "data-link";

  return `
  <div class="css-legal">
    <section class="legal-container">
      <section class="legal-hero">
        <div>
          <span class="legal-kicker">BeGO officiel</span>
          <h1>Legal et confiance</h1>
          <p>Conditions, confidentialite, assistance officielle et regles des colis avant d'utiliser BeGO.</p>
          <small>Derniere mise a jour: ${LAST_UPDATED}</small>
        </div>
        <a class="legal-hero-icon ripple" href="${backHref}" ${backAttrs} aria-label="Retour">
          <i class="fa-solid fa-shield-heart"></i>
        </a>
      </section>

      <section class="legal-trust-grid">
        <article>
          <i class="fa-solid fa-scale-balanced"></i>
          <span>Conditions claires</span>
          <p>Les prix sont presentes avant confirmation et les comptes peuvent etre bloques en cas de fraude ou risque.</p>
        </article>
        <article>
          <i class="fa-solid fa-location-dot"></i>
          <span>Donnees protegees</span>
          <p>La position sert au matching, au suivi, a la securite et a l'assistance pendant l'utilisation.</p>
        </article>
        <article>
          <i class="fa-solid fa-box"></i>
          <span>Colis controles</span>
          <p>Maximum 5 kg, contenu autorise uniquement et code a 4 chiffres a donner lors de la livraison.</p>
        </article>
      </section>

      <section class="legal-panel" id="conditions">
        <div class="legal-section-title">
          <span>Termes et conditions</span>
          <small>Utilisation</small>
        </div>
        <div class="legal-copy">
          <p>BeGO met en relation des passagers, des motoristes independants, des services de paiement disponibles et des envois de petits colis. En creant un compte ou en utilisant l'application, vous confirmez que vos informations sont exactes et que vous utilisez BeGO de maniere legale et respectueuse.</p>
          <p>Avant une course ou un envoi, l'application affiche le prix estime, le mode de paiement et les informations importantes. La demande commence seulement apres votre confirmation. BeGO peut refuser, annuler, suspendre ou limiter un compte lorsqu'il existe un risque pour la securite, un comportement abusif, une tentative de fraude, un paiement impaye ou une violation des regles.</p>
          <p>Les utilisateurs doivent respecter les motoristes, les passagers, l'equipe support et les lois applicables. Les informations de trajet, wallet, paiement, colis et support peuvent etre utilisees pour executer le service, securiser la plateforme, resoudre les litiges et respecter les obligations legales.</p>
        </div>
      </section>

      <section class="legal-panel" id="confidentialite">
        <div class="legal-section-title">
          <span>Politique de confidentialite</span>
          <small>Donnees</small>
        </div>
        <div class="legal-copy">
          <p>BeGO collecte les donnees necessaires au service: nom, telephone, email, role, photo de profil si ajoutee, position GPS pendant l'utilisation, adresses de depart et destination, historique de courses, wallet, paiements, recus, messages de support en direct et erreurs techniques de l'application.</p>
          <p>Ces donnees servent a creer le compte, verifier l'identite, connecter passager et motorista, calculer le prix, afficher le suivi, generer les recus, proteger les wallets, prevenir la fraude, ameliorer la stabilite et assister l'utilisateur. Les donnees ne sont partagees qu'avec les personnes ou services necessaires: motorista assigne, passager concerne, support BeGO, prestataires techniques, paiement ou obligations legales.</p>
          <p>Vous pouvez demander la correction, l'acces ou la suppression de vos donnees via le support officiel. Certaines informations peuvent etre conservees lorsqu'elles sont necessaires pour securite, comptabilite, litige, fraude, obligations legales ou fonctionnement du service.</p>
        </div>
      </section>

      <section class="legal-panel" id="contact">
        <div class="legal-section-title">
          <span>Support visible et contact officiel</span>
          <small>Assistance</small>
        </div>
        ${contactCards({ publicMode })}
        <div class="legal-support-note">
          <i class="fa-solid fa-circle-info"></i>
          <p>Pour une urgence pendant une course, utilisez le centre de securite ou le chat en direct. Pour une demande administrative, utilisez l'email officiel et indiquez votre telephone, trajet ou recu si disponible.</p>
        </div>
      </section>

      <section class="legal-panel" id="colis">
        <div class="legal-section-title">
          <span>Regles des colis</span>
          <small>Maximum 5 kg</small>
        </div>
        <div class="legal-package-card">
          <div>
            <span>Poids maximum</span>
            <strong>5 kg</strong>
            <p>Le colis doit etre ferme, transportable a moto, non dangereux et legal. Le motorista peut refuser un colis s'il semble risque ou mal emballe.</p>
          </div>
          <div>
            <span>Code de livraison</span>
            <strong>4 chiffres</strong>
            <p>Le code est genere par BeGO. Il doit etre partage uniquement lorsque le colis est recu par la bonne personne.</p>
          </div>
        </div>

        <div class="legal-rules-grid">
          <article>
            <i class="fa-solid fa-ban"></i>
            <span>Objets interdits</span>
            <p>Argent, cartes, bijoux, documents irremplacables, armes, explosifs, feux d'artifice, drogues, contrefacons, objets illegaux, produits inflammables, corrosifs ou dangereux.</p>
          </article>
          <article>
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Objets refuses</span>
            <p>Liquides qui peuvent fuir, produits perissables, medicaments sensibles, alcool, tabac, objets fragiles non proteges ou tout contenu qui expose BeGO, le motorista ou le public a un risque.</p>
          </article>
          <article>
            <i class="fa-solid fa-user-check"></i>
            <span>Responsabilite</span>
            <p>L'expediteur confirme le contenu, le poids et la legalite du colis. BeGO peut suspendre l'envoi et contacter support en cas de doute.</p>
          </article>
        </div>
      </section>

      <section class="legal-final-card">
        <div>
          <span>Besoin d'aide?</span>
          <strong>Contactez BeGO avant de confirmer.</strong>
          <p>Si une regle n'est pas claire, demandez au support officiel avant de commander une course ou un envoi.</p>
        </div>
        <a class="legal-primary-action ripple" href="${supportHref}" ${supportAttrs}>
          <i class="fa-solid fa-headset"></i>
          Support
        </a>
      </section>
    </section>
  </div>
  `;
}
