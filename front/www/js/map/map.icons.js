const MOTORISTA_WIDTH = 32;
const MOTORISTA_HEIGHT = 48;
const SIMPLE_SIZE = 38;
const PASSENGER_LOCATION_SIZE = 34;
const ROUTE_POINT_SIZE = 30;
const POI_SIZE = 26;

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const carSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 96">
  <defs>
    <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dbe3ea"/>
    </linearGradient>
    <linearGradient id="car-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1f2937"/>
      <stop offset="1" stop-color="#64748b"/>
    </linearGradient>
    <filter id="car-shadow" x="-40%" y="-30%" width="180%" height="180%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#020617" flood-opacity=".48"/>
    </filter>
  </defs>
  <g filter="url(#car-shadow)">
    <path d="M18 14C20 7 25 3 32 3s12 4 14 11l7 24v43c0 6-5 11-11 11H22c-6 0-11-5-11-11V38l7-24z" fill="url(#car-body)" stroke="#111827" stroke-width="2"/>
    <path d="M21 17c2-5 5-7 11-7s9 2 11 7l4 15H17l4-15z" fill="url(#car-glass)"/>
    <path d="M17 39h30v25H17z" fill="#f8fafc"/>
    <path d="M19 41h26l-3 19H22l-3-19z" fill="url(#car-glass)"/>
    <path d="M17 67h30l2 14c1 4-3 6-7 6H22c-4 0-8-2-7-6l2-14z" fill="#eef2f6"/>
    <path d="M14 70h5v12h-5zM45 70h5v12h-5z" fill="#111827"/>
    <path d="M19 82h8v4h-8zM37 82h8v4h-8z" rx="2" fill="#ef4444"/>
    <path d="M19 34h7v4h-7zM38 34h7v4h-7z" rx="2" fill="#f8fafc" stroke="#cbd5e1"/>
    <path d="M10 43h5v15h-3c-2 0-3-2-3-4v-8c0-2 0-3 1-3zM49 43h5c1 0 1 1 1 3v8c0 2-1 4-3 4h-3V43z" fill="#e2e8f0" stroke="#111827" stroke-width="1.5"/>
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
  svg: carSvg,
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

export const transparentMotoIconUrl = svgDataUrl(carSvg);
export const transparentDestinoIconUrl = svgDataUrl(destinoSvg);
export const transparentPasajeroIconUrl = svgDataUrl(pasajeroSvg);
