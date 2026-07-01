import { DOWNLOAD_APPS, getDownloadApp } from "./downloads.config.js?v=20260701-follow-zoom";
import { renderLandingIcon } from "../landing/icons.js?v=20260627-map-icons";

function renderDownloadLink(app, { className = "cta", label = app.label } = {}) {
  return `
    <a class="${className}" href="${app.href}" download data-analytics="${app.analytics}">
      ${renderLandingIcon(app.icon, "landing-icon")}
      <span>${label}</span>
    </a>
  `;
}

export function renderPassengerDownloadButton(options = {}) {
  return renderDownloadLink(getDownloadApp("passenger"), options);
}

export function renderDriverDownloadButton(options = {}) {
  return renderDownloadLink(getDownloadApp("driver"), options);
}

export function renderDownloadPanel() {
  return `
    <section class="download-panel" id="downloads" aria-labelledby="downloadsTitle">
      <div class="download-copy">
        <p class="kicker orange-badge">Apps Android oficiales</p>
        <h2 id="downloadsTitle">Descargas listas para produccion</h2>
        <p>Instala BeGO desde los enlaces oficiales para pasajeros y motoristas. Ambas apps usan la version publica mas reciente.</p>
      </div>
      <div class="download-actions" aria-label="Descargas BeGO">
        ${renderDownloadLink(DOWNLOAD_APPS.passenger, { label: DOWNLOAD_APPS.passenger.shortLabel })}
        ${renderDownloadLink(DOWNLOAD_APPS.driver, {
          className: "cta secondary",
          label: DOWNLOAD_APPS.driver.shortLabel
        })}
      </div>
    </section>
  `;
}
