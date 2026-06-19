import { renderDownloadPanel } from "../downloads/downloads.module.js";
import { LANDING_SERVICES } from "./services.registry.js";

function renderServiceCard(service) {
  const anchor = service.anchor ? ` id="${service.anchor}"` : "";

  return `
    <article class="service-card ${service.theme || ""}"${anchor}>
      <div class="icon-wrapper">
        <i class="${service.icon}" aria-hidden="true"></i>
      </div>
      <h3>${service.title}</h3>
      <p>${service.body}</p>
    </article>
  `;
}

export function renderServicesSection() {
  return `
    <section id="services" class="content-band site-shell" aria-labelledby="servicesTitle">
      <div class="section-head centered">
        <p class="kicker orange-badge">Movilidad inteligente</p>
        <h2 id="servicesTitle" class="section-title">La forma más rápida, segura y moderna de moverte</h2>
        <p>
          Diseñada para quienes esperan más de cada viaje. Conecta pasajeros
          y motoristas mediante una experiencia confiable, tecnología avanzada
          y seguimiento en tiempo real.
        </p>
      </div>

      <div class="services-showcase">
        ${LANDING_SERVICES.map(renderServiceCard).join("")}
      </div>

      ${renderDownloadPanel()}
    </section>
  `;
}
