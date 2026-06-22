const MOTORISTA_WIDTH = 40;
const MOTORISTA_HEIGHT = 40;
const SIMPLE_SIZE = 38;
const PASSENGER_LOCATION_SIZE = 34;
const ROUTE_POINT_SIZE = 30;
const POI_SIZE = 26;

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const motoTopViewSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="moto-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dbeafe"/>
    </linearGradient>
    <linearGradient id="moto-blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#60a5fa"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
    <filter id="moto-shadow" x="-45%" y="-45%" width="190%" height="190%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#020617" flood-opacity=".46"/>
    </filter>
  </defs>
  <g filter="url(#moto-shadow)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 4.5c3.8 0 6.4 2.8 6.4 7.2v5.8c0 2.7-2.1 4.8-6.4 4.8s-6.4-2.1-6.4-4.8v-5.8c0-4.4 2.6-7.2 6.4-7.2z" fill="#111827"/>
    <path d="M21.5 27.5 13 31.2M42.5 27.5l8.5 3.7" fill="none" stroke="#0f172a" stroke-width="5.2"/>
    <path d="M18 30h9M37 30h9" fill="none" stroke="#e5e7eb" stroke-width="3.4"/>
    <path d="M32 13c5.9 0 10.2 4.7 11.1 12.4l1.2 10.8c.9 8.5-4 18.1-12.3 23.3-8.3-5.2-13.2-14.8-12.3-23.3l1.2-10.8C21.8 17.7 26.1 13 32 13z" fill="url(#moto-blue)" stroke="#0f172a" stroke-width="2.2"/>
    <path d="M25.2 19.2c1.2-3.1 3.4-5.1 6.8-5.1s5.6 2 6.8 5.1l1.7 7.9h-17l1.7-7.9z" fill="url(#moto-body)" stroke="#dbeafe" stroke-width="1.5"/>
    <path d="M25.5 32.5c1.6-4 3.7-6 6.5-6s4.9 2 6.5 6l1.6 12.2c-1.3 3.9-4.1 7.2-8.1 9.8-4-2.6-6.8-5.9-8.1-9.8l1.6-12.2z" fill="#0f172a" stroke="#e5e7eb" stroke-width="1.5"/>
    <path d="M28 35.2h8M27.1 46.5h9.8" fill="none" stroke="#64748b" stroke-width="2.1"/>
    <path d="M27.7 55.1h8.6" stroke="#ef4444" stroke-width="3.2"/>
    <path d="M32 8.5v45" stroke="#ffffff" stroke-width="1.5" opacity=".28"/>
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
  svg: motoTopViewSvg,
  width: MOTORISTA_WIDTH,
  height: MOTORISTA_HEIGHT,
  anchorY: MOTORISTA_HEIGHT / 2,
  className: "bego-map-icon bego-map-icon-moto",
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

export const transparentMotoIconUrl = svgDataUrl(motoTopViewSvg);
export const transparentDestinoIconUrl = svgDataUrl(destinoSvg);
export const transparentPasajeroIconUrl = svgDataUrl(pasajeroSvg);
