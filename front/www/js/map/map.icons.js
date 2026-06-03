const MOTORISTA_SIZE = 44;
const SIMPLE_SIZE = 38;

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const motoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g fill="none" stroke="#0f172a" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="16" cy="45" r="9"/>
    <circle cx="49" cy="45" r="9"/>
    <path d="M16 45h9l8-15h9l8 15"/>
    <path d="M31 30l-5-9h-8"/>
    <path d="M40 30l8-9h7"/>
    <path d="M34 24h11"/>
    <path d="M26 45l7-15"/>
  </g>
  <g fill="none" stroke="#2563eb" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 25h11"/>
    <path d="M38 30h9"/>
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

function makeIcon({ svg, size, anchorY, className }) {
  return L.icon({
    iconUrl: svgDataUrl(svg),
    iconSize: [size, size],
    iconAnchor: [size / 2, anchorY],
    popupAnchor: [0, -Math.round(size * 0.42)],
    className,
    shadowUrl: undefined
  });
}

export const pasajeroIcon = makeIcon({
  svg: pasajeroSvg,
  size: SIMPLE_SIZE,
  anchorY: SIMPLE_SIZE,
  className: "bego-map-icon bego-map-icon-passenger",
});

export const destinoIcon = makeIcon({
  svg: destinoSvg,
  size: SIMPLE_SIZE,
  anchorY: SIMPLE_SIZE,
  className: "bego-map-icon bego-map-icon-destination",
});

export const motoIcon = makeIcon({
  svg: motoSvg,
  size: MOTORISTA_SIZE,
  anchorY: MOTORISTA_SIZE / 2,
  className: "bego-map-icon bego-map-icon-moto",
});

export function createPOIIcon(categoria = "default") {
  const colors = {
    mercado: "#f59e0b",
    hospital: "#ef4444",
    turismo: "#8b5cf6",
    plaza: "#16a34a",
    default: "#64748b"
  };
  const color = colors[categoria] || colors.default;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 58s18-19.5 18-34C50 13.5 42 6 32 6S14 13.5 14 24c0 14.5 18 34 18 34z" fill="#fff" fill-opacity=".92" stroke="${color}" stroke-width="4.2" stroke-linejoin="round"/>
    <circle cx="32" cy="24" r="7" fill="${color}"/>
  </svg>`;

  return makeIcon({
    svg,
    size: 32,
    anchorY: 32,
    className: "bego-map-icon bego-map-icon-poi"
  });
}

export const transparentMotoIconUrl = svgDataUrl(motoSvg);
export const transparentDestinoIconUrl = svgDataUrl(destinoSvg);
export const transparentPasajeroIconUrl = svgDataUrl(pasajeroSvg);
