import { initRating } from "./initRating.js";

export async function initDetalleViaje() {
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);

  const raw = safeJson(localStorage.getItem("detalleViaje"));

  if (!raw) {
    location.hash = "#/actividad";
    return;
  }

  const data = normalizarDetalle(raw);

  pintarResumen(data);
  pintarRuta(data);
  pintarMotorista(data);
  pintarMetricas(data);
  inicializarMapa(data);
  initRating(data);
}

function normalizarDetalle(raw) {
  const motorista = raw.motorista || {};
  const vehiculo = motorista.vehiculo || raw.vehiculo || {};
  const fechaInicio = raw.inicioViajeAt || raw.createdAt || raw.fecha;
  const fechaFin = raw.finViajeAt || raw.updatedAt || raw.fecha;
  const duracion = calcularDuracionMin(fechaInicio, fechaFin, raw.duracionMin);

  return {
    _id: raw._id || raw.viajeId || "",
    tipo: raw.tipo === "envio" ? "envio" : "viaje",
    estado: raw.estado || "finalizado",
    estadoPago: raw.estadoPago || "",
    fecha: raw.fecha || raw.finViajeAt || raw.createdAt,
    origen: raw.origen,
    destino: raw.destino,
    precio: raw.precio || raw.total || raw.escrow || 0,
    distanciaKm: raw.distanciaKm || metrosAKm(raw.distanciaRealMetros),
    duracionMin: duracion,
    metodoPago: raw.metodoPago || "",
    motorista,
    vehiculo,
    rating: raw.rating,
    paquete: raw.paquete || null,
  };
}

function pintarResumen(data) {
  setText("#detalleTipo", data.tipo === "envio" ? "Envoi BeGO" : "Course BeGO");
  setText("#detalleEstado", estadoLabel(data.estado));
  setText("#detalleFecha", formatDate(data.fecha));
  setText("#detalleBadge", estadoBadge(data.estado));
  setText("#detalleTotal", `HTG ${money(data.precio)}`);
  setText("#detallePago", `Paiement ${paymentLabel(data.metodoPago, data.estadoPago)}`);

  const icon = document.querySelector("#detalleIcono i");
  if (icon) {
    icon.className = `fa-solid ${data.tipo === "envio" ? "fa-box" : "fa-motorcycle"}`;
  }

  const badge = document.getElementById("detalleBadge");
  if (badge) {
    badge.classList.toggle("cancelado", data.estado === "cancelado");
    badge.classList.toggle("activo", ["buscando", "aceptado", "asignado", "llego", "en_curso"].includes(data.estado));
  }
}

function pintarRuta(data) {
  setText("#detalleOrigen", formatLugar(data.origen));
  setText("#detalleDestino", formatLugar(data.destino));
}

function pintarMotorista(data) {
  const nombre = nombreMotorista(data.motorista);
  const vehiculo = data.vehiculo || {};
  const vehiculoTexto = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ") || "Moto BeGO";
  const placa = vehiculo.placa ? ` - ${vehiculo.placa}` : "";

  setText("#detalleMotorista", nombre);
  setText("#detalleVehiculo", `${vehiculoTexto}${placa}`);
  setText("#detalleTelefono", data.motorista?.telefono ? `Tel: ${data.motorista.telefono}` : "Verification BeGO");
  setText("#detalleMotoristaInicial", iniciales(nombre));
}

function pintarMetricas(data) {
  setText("#detalleDistancia", data.distanciaKm ? `${formatNumber(data.distanciaKm)} km` : "-- km");
  setText("#detalleDuracion", data.duracionMin ? `${data.duracionMin} min` : "--");
  setText("#detalleId", shortId(data._id));
}

function inicializarMapa(data) {
  const mapEl = document.getElementById("mapDetalle");
  if (!mapEl) return;

  if (!tieneCoordenadas(data.origen) || !tieneCoordenadas(data.destino) || typeof L === "undefined") {
    mapEl.classList.add("sin-mapa");
    mapEl.innerHTML = `
      <div class="map-placeholder">
        <i class="fa-solid fa-map-location-dot"></i>
        <span>Carte indisponible</span>
      </div>
    `;
    return;
  }

  if (mapEl._leaflet_id) {
    mapEl._leaflet_id = null;
    mapEl.innerHTML = "";
  }

  const map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
  }).setView([data.origen.lat, data.origen.lng], 15);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
  }).addTo(map);

  L.circleMarker([data.origen.lat, data.origen.lng], {
    radius: 7,
    color: "#bfdbfe",
    fillColor: "#2563eb",
    fillOpacity: 1,
    weight: 3,
  }).addTo(map);

  L.circleMarker([data.destino.lat, data.destino.lng], {
    radius: 7,
    color: "#e2e8f0",
    fillColor: "#0f172a",
    fillOpacity: 1,
    weight: 3,
  }).addTo(map);

  const lineaRapida = L.polyline(
    [
      [data.origen.lat, data.origen.lng],
      [data.destino.lat, data.destino.lng],
    ],
    {
      color: "#60a5fa",
      weight: 4,
      dashArray: "8,8",
      opacity: 0.88,
    }
  ).addTo(map);

  map.fitBounds(lineaRapida.getBounds(), { padding: [34, 34] });
  setTimeout(() => map.invalidateSize(), 220);

  cargarRutaReal({ data, map, lineaRapida });
}

async function cargarRutaReal({ data, map, lineaRapida }) {
  const cacheKey = `ruta_${data._id || `${data.origen.lat}_${data.destino.lat}`}`;
  const cache = safeJson(localStorage.getItem(cacheKey));

  if (Array.isArray(cache) && cache.length) {
    pintarRutaMapa(map, lineaRapida, cache);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://router.project-osrm.org/route/v1/driving/${data.origen.lng},${data.origen.lat};${data.destino.lng},${data.destino.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const json = await res.json();

    if (!json.routes?.length) return;

    const coords = json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    localStorage.setItem(cacheKey, JSON.stringify(coords));
    pintarRutaMapa(map, lineaRapida, coords);
  } catch (err) {
    console.warn("Ruta real no disponible, usando linea base:", err.message);
  }
}

function pintarRutaMapa(map, lineaRapida, coords) {
  const ruta = L.polyline(coords, {
    color: "#38bdf8",
    weight: 6,
    opacity: 0.96,
  }).addTo(map);

  map.removeLayer(lineaRapida);
  map.fitBounds(ruta.getBounds(), { padding: [34, 34] });
  setTimeout(() => map.invalidateSize(), 180);
}

function estadoLabel(estado) {
  const labels = {
    finalizado: "Course terminee",
    cancelado: "Course annulee",
    en_curso: "Course en cours",
    aceptado: "Conducteur en route",
    asignado: "Conducteur assigne",
    llego: "Conducteur arrive",
    buscando: "Recherche en cours",
    reservado: "Reservation active",
  };
  return labels[estado] || "Course BeGO";
}

function estadoBadge(estado) {
  if (estado === "cancelado") return "Annulee";
  if (["buscando", "aceptado", "asignado", "llego", "en_curso", "reservado"].includes(estado)) return "Active";
  return "Complete";
}

function paymentLabel(metodo, estadoPago) {
  const labels = {
    efectivo: "especes",
    wallet: "wallet",
    moncash: "MonCash",
    natcash: "NatCash",
  };
  const label = labels[String(metodo || "").toLowerCase()] || "non precise";
  return estadoPago ? `${label} - ${estadoPago}` : label;
}

function nombreMotorista(motorista) {
  if (!motorista || typeof motorista !== "object") return "Socio BeGO";
  return `${motorista.nombre || ""} ${motorista.apellido || ""}`.trim() || "Socio BeGO";
}

function iniciales(nombre) {
  const partes = String(nombre || "B").trim().split(/\s+/).filter(Boolean);
  const primera = partes[0]?.[0] || "B";
  const segunda = partes[1]?.[0] || "";
  return `${primera}${segunda}`.toUpperCase();
}

function shortId(value) {
  const id = String(value || "--");
  return id.length > 10 ? `${id.slice(0, 5)}...${id.slice(-4)}` : id;
}

function formatLugar(lugar) {
  if (!lugar) return "--";
  if (typeof lugar === "string") return lugar;
  if (lugar.direccion) return lugar.direccion;
  if (lugar.address) return lugar.address;
  if (tieneCoordenadas(lugar)) return `Lat ${Number(lugar.lat).toFixed(5)}, Lng ${Number(lugar.lng).toFixed(5)}`;
  return "--";
}

function tieneCoordenadas(lugar) {
  return Number.isFinite(Number(lugar?.lat)) && Number.isFinite(Number(lugar?.lng));
}

function calcularDuracionMin(inicio, fin, fallback) {
  const value = Number(fallback || 0);
  if (value > 0) return Math.round(value);

  const start = new Date(inicio).getTime();
  const end = new Date(fin).getTime();
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return Math.max(1, Math.round((end - start) / 60000));
  }
  return 0;
}

function metrosAKm(metros) {
  const value = Number(metros || 0);
  if (!value) return 0;
  return Number((value / 1000).toFixed(2));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value) {
  return Number(value || 0).toLocaleString("fr-HT", { maximumFractionDigits: 0 });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("fr-HT", {
    minimumFractionDigits: Number(value) % 1 ? 1 : 0,
    maximumFractionDigits: 2,
  });
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
