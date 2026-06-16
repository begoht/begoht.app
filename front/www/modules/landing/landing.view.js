import { renderHeader } from "./header.js";
import { renderHero } from "./hero.js";
import { renderTechnologySection } from "./technology.js";
import { renderServicesSection } from "./services.js";
import { renderSupportFooter } from "../soporte/soporte.module.js";

export function renderLandingPage() {
  return `
    ${renderHeader()}
    ${renderHero()}
    ${renderTechnologySection()}
    ${renderServicesSection()}
    ${renderSupportFooter()}
  `;
}
