// 🎯 BASE FACTOR (escala global para DPI alto)
const SIZE = 30;

/*************************************************
 * 👤 PASAJERO (ESTILO APP MODERNA)
 *************************************************/
export const pasajeroIcon = L.divIcon({
  className: "icon-premium",
  html: `
    <div style="
      width:${SIZE}px;
      height:${SIZE}px;
      border-radius:50%;
      background:linear-gradient(135deg,#00e5ff,#0ea5e9);
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 6px 18px rgba(0,229,255,0.35), 0 0 0 3px rgba(255,255,255,0.9);
      border:2px solid white;
    ">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
      </svg>
    </div>
  `,
  iconSize: [SIZE, SIZE],
  iconAnchor: [SIZE / 2, SIZE], // 👇 pegado al punto exacto
});

/*************************************************
 * 📍 DESTINO (PIN MODERNO CON PULSE)
 *************************************************/
export const destinoIcon = L.divIcon({
  className: "icon-premium",
  html: `
    <div style="position:relative;">
      <div style="
        width:${SIZE}px;
        height:${SIZE}px;
        border-radius:50%;
        background:linear-gradient(135deg,#ef4444,#b91c1c);
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 6px 18px rgba(239,68,68,0.4);
        border:2px solid white;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8 2 5 5 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-4-3-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/>
        </svg>
      </div>

      <!-- 🔥 efecto pulse -->
      <div style="
        position:absolute;
        top:0;
        left:0;
        width:${SIZE}px;
        height:${SIZE}px;
        border-radius:50%;
        background:rgba(239,68,68,0.25);
        animation:pulse 1.6s infinite;
      "></div>
    </div>
  `,
  iconSize: [SIZE, SIZE],
  iconAnchor: [SIZE / 2, SIZE],
});

/*************************************************
 * 🛵 MOTORISTA (TOP PRIORIDAD VISUAL)
 *************************************************/
export const motoIcon = L.divIcon({
  className: "icon-premium",
  html: `
    <div style="
      width:${SIZE}px;
      height:${SIZE}px;
      border-radius:14px;
      background:linear-gradient(135deg,#22c55e,#16a34a);
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 8px 22px rgba(34,197,94,0.45);
      border:2px solid white;
      transform:rotate(0deg);
      transition:transform 0.2s ease;
    ">
      <svg width="18" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M19 7h-1l-2-3H8L6 7H5c-1.7 0-3 1.3-3 3v5h2c0 1.7 1.3 3 3 3s3-1.3 3-3h4c0 1.7 1.3 3 3 3s3-1.3 3-3h2v-5c0-1.7-1.3-3-3-3zM7 17c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm10 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z"/>
      </svg>
    </div>
  `,
  iconSize: [SIZE, SIZE],
  iconAnchor: [SIZE / 2, SIZE / 2], // 🛵 centrado para tracking
});

/*************************************************
 * 🗺️ POI / REFERENCIAS
 *************************************************/
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

  const config =
    styles[categoria] ||
    styles.default;

  return L.divIcon({

    className: "icon-poi",

    html: `
      <div style="
        width:${SIZE - 4}px;
        height:${SIZE - 4}px;
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

    iconSize: [SIZE - 4, SIZE - 4],

    iconAnchor: [
      (SIZE - 4) / 2,
      SIZE - 4
    ]
  });
}