const MOTORISTA_SIZE = 44;

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

export const transparentMotoIconUrl = svgDataUrl(motoSvg);

export const motoIcon = L.icon({
  iconUrl: transparentMotoIconUrl,
  iconSize: [MOTORISTA_SIZE, MOTORISTA_SIZE],
  iconAnchor: [MOTORISTA_SIZE / 2, MOTORISTA_SIZE / 2],
  popupAnchor: [0, -18],
  className: "bego-map-icon bego-map-icon-moto"
});
