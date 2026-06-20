const NAVIGATION_SIZE = 58;

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const navigationSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="nav-shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#020617" flood-opacity=".42"/>
    </filter>
  </defs>
  <g filter="url(#nav-shadow)">
    <circle cx="32" cy="32" r="28" fill="#ffffff" fill-opacity=".96"/>
    <circle cx="32" cy="32" r="24.5" fill="#1677e8"/>
    <path d="M32 13 47 46 32 39 17 46z" fill="#ffffff" stroke="#dbeafe" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M32 19v20" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".32"/>
  </g>
</svg>`;

export const transparentMotoIconUrl = svgDataUrl(navigationSvg);

export function crearMotoIcon() {
  if (!window.L?.icon) return null;

  return L.icon({
    iconUrl: transparentMotoIconUrl,
    iconSize: [NAVIGATION_SIZE, NAVIGATION_SIZE],
    iconAnchor: [NAVIGATION_SIZE / 2, NAVIGATION_SIZE / 2],
    popupAnchor: [0, -26],
    className: "bego-map-icon bego-map-icon-navigation"
  });
}

export const motoIcon = crearMotoIcon();
