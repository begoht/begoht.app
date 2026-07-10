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
    <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset=".58" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#d7dce2"/>
    </linearGradient>
    <filter id="car-shadow" x="-45%" y="-45%" width="190%" height="190%">
      <feDropShadow dx="0" dy="5" stdDeviation="3.2" flood-color="#020617" flood-opacity=".45"/>
    </filter>
  </defs>
  <g filter="url(#car-shadow)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 16.5c1.6-6.5 5.1-10 12-10s10.4 3.5 12 10l3.2 20.8c1.1 7.1-2.8 15.1-9.2 18.8-1.9 1.1-4 1.6-6 1.6s-4.1-.5-6-1.6c-6.4-3.7-10.3-11.7-9.2-18.8L20 16.5z" fill="url(#car-body)" stroke="#4b5563" stroke-width="2.2"/>
    <path d="M24.8 18.6c1.4-4.3 3.6-6.5 7.2-6.5s5.8 2.2 7.2 6.5l1.3 7.8h-17l1.3-7.8z" fill="#111827" opacity=".78"/>
    <path d="M23.1 33.2h17.8l-1.5 12.6c-2.1 2.5-4.6 3.8-7.4 3.8s-5.3-1.3-7.4-3.8l-1.5-12.6z" fill="#e5e7eb" stroke="#cbd5e1" stroke-width="1.2"/>
    <path d="M19.5 24.8h-3.8M48.3 24.8h-3.8M19.1 42.2h-3.5M48.4 42.2h-3.5" stroke="#111827" stroke-width="4"/>
    <path d="M23.2 54.1h17.6" stroke="#ef4444" stroke-width="3.2"/>
    <path d="M23.7 15.9c1.8-4.2 4.4-6.1 8.3-6.1s6.5 1.9 8.3 6.1M23.6 30.6h16.8" stroke="#ffffff" stroke-width="1.7" opacity=".72"/>
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
