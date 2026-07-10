const MOTORISTA_WIDTH = 40;
const MOTORISTA_HEIGHT = 40;
const SIMPLE_SIZE = 38;
const PASSENGER_LOCATION_SIZE = 20;
const ROUTE_POINT_SIZE = 20;
const POI_SIZE = 26;

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const carTopViewSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="car-body" x1="16" y1="8" x2="48" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset=".45" stop-color="#f3f4f6"/>
      <stop offset="1" stop-color="#cfd5dc"/>
    </linearGradient>
    <linearGradient id="car-glass" x1="22" y1="11" x2="42" y2="42" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#24272c"/>
      <stop offset="1" stop-color="#05070a"/>
    </linearGradient>
    <filter id="car-shadow" x="-45%" y="-45%" width="190%" height="190%">
      <feDropShadow dx="0" dy="4" stdDeviation="2.8" flood-color="#020617" flood-opacity=".48"/>
    </filter>
  </defs>
  <g filter="url(#car-shadow)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.7 22.4c.9-7 5.9-11.8 14.3-11.8s13.4 4.8 14.3 11.8l2 15.7c.7 5.7-2.3 10.7-7.8 13.2-2.9 1.3-5.7 2-8.5 2s-5.6-.7-8.5-2c-5.5-2.5-8.5-7.5-7.8-13.2l2-15.7z" fill="url(#car-body)" stroke="#6b7280" stroke-width="1.8"/>
    <path d="M23.4 22.7c1.3-5.1 4-7.6 8.6-7.6s7.3 2.5 8.6 7.6l.7 3.2H22.7l.7-3.2z" fill="url(#car-glass)"/>
    <path d="M22.1 31.8h19.8l-1.8 9.9c-2.4 2.1-5.1 3.1-8.1 3.1s-5.7-1-8.1-3.1l-1.8-9.9z" fill="#f9fafb" stroke="#d1d5db" stroke-width="1.1"/>
    <path d="M21.7 29h20.6" stroke="#ffffff" stroke-width="1.8" opacity=".88"/>
    <path d="M21.3 48.1c3.3 1.4 6.9 2.2 10.7 2.2s7.4-.8 10.7-2.2" stroke="#b8c0ca" stroke-width="1.8"/>
    <path d="M23.5 51.2h17" stroke="#ef4444" stroke-width="3.4"/>
    <path d="M17.2 27.2h-3.4M50.2 27.2h-3.4M16.9 40.8h-3M50.1 40.8h-3" stroke="#111827" stroke-width="3.4"/>
    <path d="M23 18.1c2.1-3.8 5-5.4 9-5.4s6.9 1.6 9 5.4" stroke="#ffffff" stroke-width="1.6" opacity=".72"/>
  </g>
</svg>`;

const pasajeroSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g fill="none" stroke="#2563eb" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="32" cy="20" r="10"/>
    <path d="M15 55c2.4-12 11-18 17-18s14.6 6 17 18"/>
  </g>
  <path fill="#ffffff" stroke="#0f172a" stroke-width="2.4" d="M32 35c-12.5 0-22 8.5-22 20h44c0-11.5-9.5-20-22-20z" opacity=".92"/>
  <circle cx="32" cy="20" r="10" fill="#ffffff" stroke="#0f172a" stroke-width="2.4" opacity=".92"/>
</svg>`;

const destinoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <path d="M32 59s20-21.4 20-37C52 11 43 3 32 3S12 11 12 22c0 15.6 20 37 20 37z" fill="#ffffff" fill-opacity=".94" stroke="#dc2626" stroke-width="4.5" stroke-linejoin="round"/>
  <circle cx="32" cy="22" r="8" fill="none" stroke="#0f172a" stroke-width="4"/>
</svg>`;

function makeIcon({ svg, width, height, anchorY, className }) {
  return L.icon({
    iconUrl: svgDataUrl(svg),
    iconSize: [width, height],
    iconAnchor: [width / 2, anchorY],
    popupAnchor: [0, -Math.round(height * 0.42)],
    className,
    shadowUrl: undefined
  });
}

export const pasajeroIcon = L.divIcon({
  html: `
    <span class="bego-route-point bego-route-point-origin" aria-hidden="true">
      <span class="bego-route-point__core"></span>
    </span>
  `,
  iconSize: [PASSENGER_LOCATION_SIZE, PASSENGER_LOCATION_SIZE],
  iconAnchor: [PASSENGER_LOCATION_SIZE / 2, PASSENGER_LOCATION_SIZE / 2],
  popupAnchor: [0, -24],
  className: "bego-map-icon bego-map-icon-passenger-dot",
});

export const destinoIcon = L.divIcon({
  html: `
    <span class="bego-route-point bego-route-point-destination" aria-hidden="true">
      <span class="bego-route-point__core"></span>
    </span>
  `,
  iconSize: [ROUTE_POINT_SIZE, ROUTE_POINT_SIZE],
  iconAnchor: [ROUTE_POINT_SIZE / 2, ROUTE_POINT_SIZE / 2],
  popupAnchor: [0, -18],
  className: "bego-map-icon bego-map-icon-destination",
});

export const motoIcon = makeIcon({
  svg: carTopViewSvg,
  width: MOTORISTA_WIDTH,
  height: MOTORISTA_HEIGHT,
  anchorY: MOTORISTA_HEIGHT / 2,
  className: "bego-map-icon bego-map-icon-car",
});

export function createPOIIcon(categoria = "default") {
  const styles = {
    mercado: {
      bg: "#f59e0b",
      icon: "🛒"
    },
    hospital: {
      bg: "#ef4444",
      icon: "🏥"
    },
    turismo: {
      bg: "#8b5cf6",
      icon: "📸"
    },
    plaza: {
      bg: "#22c55e",
      icon: "🌳"
    },
    default: {
      bg: "#64748b",
      icon: "📍"
    }
  };

  const config = styles[categoria] || styles.default;

  return L.divIcon({
    className: "icon-poi",
    html: `
      <div style="
        width:${POI_SIZE}px;
        height:${POI_SIZE}px;
        border-radius:12px;
        background:${config.bg};
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:16px;
        font-weight:bold;
        border:2px solid white;
        box-shadow:0 4px 12px rgba(0,0,0,0.25);
      ">
        ${config.icon}
      </div>
    `,
    iconSize: [POI_SIZE, POI_SIZE],
    iconAnchor: [POI_SIZE / 2, POI_SIZE]
  });
}

export const transparentMotoIconUrl = svgDataUrl(carTopViewSvg);
export const transparentDestinoIconUrl = svgDataUrl(destinoSvg);
export const transparentPasajeroIconUrl = svgDataUrl(pasajeroSvg);
