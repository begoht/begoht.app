import { renderLandingIcon } from "./icons.js?v=20260627-map-icons";

const NAV_ITEMS = Object.freeze([
  { href: "#home", label: "Inicio" },
  { href: "#services", label: "Servicios" },
  { href: "#how-it-works", label: "Cómo funciona" },
  { href: "#wallet", label: "Wallet" },
  { href: "#downloads", label: "Descargas" },
  { href: "#soporte", label: "Soporte" }
]);

export function renderHeader() {
  return `
    <header class="topbar site-shell" aria-label="BeGO">
      <a href="#home" class="brand" aria-label="Inicio BeGO" data-analytics="nav_home">
        <span>Be</span>GO<span class="dot">.</span>
      </a>

      <button class="icon-button menu-toggle" id="menuToggle" type="button" aria-controls="publicMenu" aria-expanded="false">
        ${renderLandingIcon("menu", "landing-icon")}
        <span>Menu</span>
      </button>

      <nav class="top-actions" id="publicMenu" aria-label="Navegacion principal">
        ${NAV_ITEMS.map((item, index) => `
          <a class="top-link${index === 0 ? " active" : ""}" href="${item.href}" data-analytics="nav_${item.label.toLowerCase()}">${item.label}</a>
        `).join("")}
      </nav>
    </header>
  `;
}
