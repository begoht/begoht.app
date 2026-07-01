import { renderHeader } from "./header.js?v=20260627-map-icons";
import { renderHero } from "./hero.js?v=20260701-follow-zoom";
import { renderServicesSection } from "./services.js?v=20260701-follow-zoom";
import { renderSupportFooter } from "../soporte/soporte.module.js?v=20260627-map-icons";

export function renderLandingPage() {
  return `
    ${renderHeader()}
    ${renderHero()}
    ${renderServicesSection()}
    ${renderSupportFooter()}
  `;
}
