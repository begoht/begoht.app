export function renderSeguridad() {
  return `
  <div class="css-seguridad">
    <section class="seguridad">
      <section class="support-hero security-hero">
        <div>
          <span class="support-kicker">Protection active</span>
          <h1>Securite</h1>
          <p>Actions rapides pour partager votre course, demander de l'aide et signaler une situation.</p>
        </div>
        <button class="security-sos-fab ripple" id="btnSOS" data-action="sos" type="button" aria-label="Envoyer une urgence">
          SOS
        </button>
      </section>

      <section id="viajeActivoBox" class="security-active-trip">
        <i class="fa-solid fa-route"></i>
        <div>
          <span>Course active</span>
          <p id="infoViaje">Aucune course active</p>
        </div>
        <a href="#/" data-link aria-label="Voir la course active">
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>

      <section class="security-command-grid" aria-label="Actions de securite">
        <button class="security-command emergency ripple" data-action="sos" type="button">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Urgence</span>
          <p>Alerter BeGO maintenant.</p>
        </button>

        <button class="security-command ripple" data-action="compartir" type="button">
          <i class="fa-solid fa-location-dot"></i>
          <span>Partager</span>
          <p>Envoyer le suivi en direct.</p>
        </button>

        <button class="security-command ripple" data-action="contacto" type="button">
          <i class="fa-solid fa-user-shield"></i>
          <span>Contact sur</span>
          <p>Appeler votre contact garde.</p>
        </button>

        <button class="security-command ripple" id="btnReportar" data-action="reportar" type="button">
          <i class="fa-solid fa-flag"></i>
          <span>Signaler</span>
          <p>Informer un probleme.</p>
        </button>
      </section>

      <section class="support-panel security-list-panel">
        <div class="support-section-title">
          <span>Controles de course</span>
          <small>Verification BeGO</small>
        </div>

        <a class="support-list-row ripple" href="#/datos-motorista" data-link>
          <i class="fa-solid fa-id-card"></i>
          <div>
            <span>Donnees du conducteur</span>
            <p>Identite, vehicule et plaque assignee.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <button class="support-list-row ripple" id="btnAudio" type="button">
          <i class="fa-solid fa-microphone"></i>
          <div>
            <span>Enregistrement audio</span>
            <p>Garder une preuve pendant la course si necessaire.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </button>

        <a class="support-list-row ripple" href="#/soporte" data-link>
          <i class="fa-solid fa-headset"></i>
          <div>
            <span>Assistance BeGO</span>
            <p>Parler avec le support pour course, paiement ou compte.</p>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </a>
      </section>
    </section>
  </div>
  `;
}
