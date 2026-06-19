import { renderHeader } from "./header.js?v=20260619-mobility-steps";
import { renderHero } from "./hero.js?v=20260619-download-links";
import { renderServicesSection } from "./services.js?v=20260619-mobility-steps";
import { renderSupportFooter } from "../soporte/soporte.module.js";

export function renderLandingPage() {
  return `
    ${renderHeader()}
    ${renderHero()}
    ${renderServicesSection()}
    ${renderSupportFooter()}
  `;
}
