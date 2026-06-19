import { renderDownloadPanel } from "../downloads/downloads.module.js";
import { LANDING_SERVICES } from "./services.registry.js?v=20260619-mobility-steps";
import { renderLandingIcon } from "./icons.js?v=20260619-mobility-steps";

function renderServiceCard(service) {
  const anchor = service.anchor ? ` id="${service.anchor}"` : "";

  return `
    <article class="mobility-card ${service.theme || ""}"${anchor}>
      ${renderLandingIcon(service.icon, "mobility-card-icon")}
      <h3>${service.title}</h3>
      <p>${service.body}</p>
    </article>
  `;
}

const TRIP_STEPS = Object.freeze([
  Object.freeze({
    number: "01",
    icon: "pin",
    title: "Pide tu viaje",
    body: "Indica tu origen y destino. Verás el precio estimado antes de confirmar."
  }),
  Object.freeze({
    number: "02",
    icon: "rider",
    title: "Conecta con un motorista",
    body: "Nuestro sistema encuentra al conductor más cercano en segundos."
  }),
  Object.freeze({
    number: "03",
    icon: "navigation",
    title: "Sigue tu ruta en vivo",
    body: "Observa la llegada de tu conductor y comparte el seguimiento con quien quieras."
  }),
  Object.freeze({
    number: "04",
    icon: "star",
    title: "Paga y califica",
    body: "Paga con tu billetera o efectivo y deja tu calificación al finalizar."
  })
]);

export function renderServicesSection() {
  return `
    <section id="services" class="content-band site-shell" aria-labelledby="servicesTitle">
      <div class="section-head">
        <p class="kicker orange-badge">Movilidad inteligente</p>
        <h2 id="servicesTitle" class="section-title">La forma más rápida, segura y moderna de moverte</h2>
        <p>
          Diseñada para quienes esperan más de cada viaje. Conecta pasajeros
          y motoristas mediante una experiencia confiable, tecnología avanzada
          y seguimiento en tiempo real.
        </p>
      </div>

      <div class="mobility-split">
        <div class="mobility-highlight">
          <div class="mobility-status">
            <div class="pulse-dot" aria-hidden="true"></div>
            <div>
              <span>Todo en una sola app</span>
              <strong>Tu viaje conectado de principio a fin</strong>
              <p>
                Solicita, sigue y paga tu viaje desde una experiencia diseñada para
                darte rapidez, control y tranquilidad en cada trayecto.
              </p>
            </div>
          </div>
        </div>

        <div class="mobility-grid" aria-label="Servicios y beneficios BeGO">
          ${LANDING_SERVICES.map(renderServiceCard).join("")}
        </div>
      </div>

      <section id="how-it-works" class="trip-steps" aria-labelledby="stepsTitle">
        <div class="section-head centered">
          <p class="kicker">Así de simple</p>
          <h2 id="stepsTitle" class="section-title">Cuatro pasos y estás en camino.</h2>
        </div>

        <div class="trip-steps-grid">
          ${TRIP_STEPS.map((step) => `
            <article class="trip-step">
              <span class="trip-step-number">${step.number}</span>
              ${renderLandingIcon(step.icon, "trip-step-icon")}
              <h3>${step.title}</h3>
              <p>${step.body}</p>
            </article>
          `).join("")}
        </div>
      </section>

      ${renderDownloadPanel()}
    </section>
  `;
}
