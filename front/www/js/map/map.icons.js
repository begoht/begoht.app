const MOTORISTA_WIDTH = 38;
const MOTORISTA_HEIGHT = 40;
const SIMPLE_SIZE = 38;
const PASSENGER_LOCATION_SIZE = 20;
const ROUTE_POINT_SIZE = 20;
const POI_SIZE = 26;
const motoristaReferenceUrl = new URL(
  "../../assets/icons/bego-motorista-map.png?v=20260718-bego-moto-map",
  import.meta.url
).href;

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

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

function makeImageIcon({ url, width, height, anchorY, className }) {
  return L.icon({
    iconUrl: url,
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

export const motoIcon = makeImageIcon({
  url: motoristaReferenceUrl,
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

export const transparentMotoIconUrl = motoristaReferenceUrl;
export const transparentDestinoIconUrl = svgDataUrl(destinoSvg);
export const transparentPasajeroIconUrl = svgDataUrl(pasajeroSvg);
