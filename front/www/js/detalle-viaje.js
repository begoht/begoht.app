import { initRating } from "./initRating.js";

export async function initDetalleViaje() {
  // 🔥 esperar DOM (SPA fix)
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);

  const raw = JSON.parse(localStorage.getItem("detalleViaje"));

  if (!raw) {
    location.hash = "#/actividad";
    return;
  }

  const data = {
    estado: raw.estado,
    fecha: raw.fecha || raw.finViajeAt || raw.createdAt,
    origen: raw.origen,
    destino: raw.destino,
    precio: raw.precio,
    motorista: raw.motorista,
    rating: raw.rating,
    _id: raw._id
  };

  /*************************************************
   * ESTADO
   *************************************************/
  const badge = document.querySelector(".estado-badge");

  if (badge) {
    const estados = {
      finalizado: "Completado",
      cancelado: "Cancelado",
      en_curso: "En curso",
      aceptado: "En camino"
    };

    badge.textContent = estados[data.estado] || data.estado || "—";

    badge.classList.remove("cancelado", "completado");

    if (data.estado === "cancelado") {
      badge.classList.add("cancelado");
    } else {
      badge.classList.add("completado");
    }
  }

  const fechaEl = document.querySelector(".detalle-estado small");
  if (fechaEl) {
    fechaEl.textContent = data.fecha
      ? new Date(data.fecha).toLocaleString()
      : "—";
  }

  /*************************************************
   * RUTA TEXTO
   *************************************************/
  const rutaEl = document.querySelector(".ruta-texto");
  if (rutaEl) {
    rutaEl.innerHTML = `
      <p><strong>Origen</strong><br>${formatLugar(data.origen)}</p>
      <p><strong>Destino</strong><br>${formatLugar(data.destino)}</p>
    `;
  }

  /*************************************************
   * MOTORISTA
   *************************************************/
  const motoristaEl = document.querySelector(".motorista-detalle strong");
  if (motoristaEl) {
    motoristaEl.textContent =
      typeof data.motorista === "object"
        ? `${data.motorista?.nombre || ""} ${data.motorista?.apellido || ""}`.trim() || "—"
        : "Motorista";
  }

  /*************************************************
   * PRECIO
   *************************************************/
  const precioEl = document.querySelector(".pago-linea strong");
  if (precioEl) {
    precioEl.textContent = data.precio
      ? `HTG ${Number(data.precio).toLocaleString()}`
      : "—";
  }

  /*************************************************
   * MAPA (SIN LAG UX)
   *************************************************/
  if (
    typeof data.origen?.lat !== "number" ||
    typeof data.destino?.lat !== "number"
  ) return;

  const mapEl = document.getElementById("mapDetalle");
  if (!mapEl) return;

  // 🔥 limpiar mapa (SPA fix)
  if (mapEl._leaflet_id) {
    mapEl._leaflet_id = null;
    mapEl.innerHTML = "";
  }

  const map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
  }).setView([data.origen.lat, data.origen.lng], 15);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 }
  ).addTo(map);

  L.marker([data.origen.lat, data.origen.lng]).addTo(map);
  L.marker([data.destino.lat, data.destino.lng]).addTo(map);

  /*************************************************
   * ⚡ LÍNEA INSTANTÁNEA (UX PRO)
   *************************************************/
  const lineaRapida = L.polyline(
    [
      [data.origen.lat, data.origen.lng],
      [data.destino.lat, data.destino.lng]
    ],
    {
      color: "#555",
      weight: 4,
      dashArray: "6,6"
    }
  ).addTo(map);

  map.fitBounds(lineaRapida.getBounds(), { padding: [30, 30] });

  /*************************************************
   * ⚡ CACHE DE RUTA
   *************************************************/
  const cacheKey = `ruta_${data._id}`;
  const cache = localStorage.getItem(cacheKey);

  if (cache) {
    const coords = JSON.parse(cache);

    L.polyline(coords, {
      color: "#00e5ff",
      weight: 6,
    }).addTo(map);

    map.removeLayer(lineaRapida);
    return;
  }

  /*************************************************
   * 🌐 FETCH CON TIMEOUT
   *************************************************/
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = `https://router.project-osrm.org/route/v1/driving/${data.origen.lng},${data.origen.lat};${data.destino.lng},${data.destino.lat}?overview=full&geometries=geojson`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const json = await res.json();

    if (json.routes?.length) {
      const coords = json.routes[0].geometry.coordinates.map(
        ([lng, lat]) => [lat, lng]
      );

      // 💾 guardar cache
      localStorage.setItem(cacheKey, JSON.stringify(coords));

      const ruta = L.polyline(coords, {
        color: "#00e5ff",
        weight: 6,
      }).addTo(map);

      map.removeLayer(lineaRapida);

      map.fitBounds(ruta.getBounds(), { padding: [30, 30] });

      setTimeout(() => map.invalidateSize(), 200);
    }

  } catch (err) {
    console.warn("⚠️ OSRM lento o falló, usando línea básica");
  }

  /*************************************************
   * HELPERS
   *************************************************/
  function formatLugar(lugar) {
    if (!lugar) return "—";

    if (lugar.direccion) return lugar.direccion;

    if (typeof lugar === "string") return lugar;

    if (typeof lugar.lat === "number" && typeof lugar.lng === "number") {
      return `Lat ${lugar.lat.toFixed(5)}, Lng ${lugar.lng.toFixed(5)}`;
    }

    return "—";
  }

  /*************************************************
   * BOTONES Y RATING
   *************************************************/
  initRating(data);
}