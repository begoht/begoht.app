const API = window.location.origin;

let socket = null;
let map = null;
let motoristaMarker = null;
let polylineTrayectoria = null;
let puntosTrayectoria = [];
let ultimoTrackKey = "";

init();

async function init() {
  const token = obtenerTokenSeguro();

  if (!token) {
    mostrarError("Link invalido.");
    return;
  }

  try {
    const viaje = await obtenerViaje(token);

    puntosTrayectoria = normalizarTrayectoria(viaje.trayectoriaReal);

    actualizarUI(viaje);
    initMapa(viaje);
    iniciarSocket(token);
  } catch (error) {
    console.error("Error iniciando seguimiento:", error);
    mostrarError("El viaje no esta disponible o el enlace expiro.");
  }
}

function obtenerTokenSeguro() {
  const token = window.location.pathname.split("/").filter(Boolean).pop();
  return token ? token.split("?")[0] : null;
}

async function obtenerViaje(token) {
  const res = await fetch(`${API}/api/pagos/seguir/${encodeURIComponent(token)}`);

  if (!res.ok) {
    throw new Error("Token invalido o expirado");
  }

  const data = await res.json();
  if (!data?.viaje) {
    throw new Error("Respuesta de seguimiento invalida");
  }

  return data.viaje;
}

function iniciarSocket(token) {
  socket = io(API, {
    transports: ["websocket", "polling"],
    auth: { tracking: true },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  socket.on("connect", () => {
    socket.emit("track:join", { token });
  });

  socket.on("track:posicion", actualizarMotorista);

  socket.on("viaje-finalizado", () => {
    setText("tripStatus", textoEstado("finalizado"));
  });

  socket.on("track:error", (payload = {}) => {
    console.warn("Tracking rechazado:", payload);
    mostrarError(payload.message || "El seguimiento no esta disponible.");
  });
}

function actualizarUI(viaje) {
  setText("originText", viaje.origen?.direccion || "Origen");
  setText("destText", viaje.destino?.direccion || "Destino");
  setText("driverName", nombreMotorista(viaje.motorista));
  setText("carModel", descripcionVehiculo(viaje.motorista));
  setText("carPlate", placaMotorista(viaje.motorista));

  const driverImg = document.getElementById("driverImg");
  if (driverImg) {
    driverImg.src = viaje.motorista?.foto || "/assets/logo_primcial.png";
  }

  const callBtn = document.getElementById("callBtn");
  if (callBtn) {
    callBtn.href = viaje.motorista?.telefono ? `tel:${viaje.motorista.telefono}` : "#";
  }

  setText("tripStatus", textoEstado(viaje.estado));
}

function initMapa(viaje) {
  const origen = normalizarPunto(viaje.origen);
  const destino = normalizarPunto(viaje.destino);

  if (!origen) {
    throw new Error("Origen invalido");
  }

  map = L.map("map", { zoomControl: false }).setView(origen, 15);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: "OpenStreetMap"
  }).addTo(map);

  L.marker(origen).addTo(map).bindTooltip("Recogida", {
    permanent: true,
    direction: "top",
    className: "custom-label"
  });

  const bounds = [origen];

  if (destino) {
    L.marker(destino).addTo(map).bindTooltip("Destino", {
      permanent: true,
      direction: "top",
      className: "custom-label"
    });

    bounds.push(destino);
    const ruta = normalizarRuta(viaje.rutaPoints, origen, destino);
    L.polyline(ruta, { color: "#bdc3c7", weight: 4, opacity: 0.55 }).addTo(map);
  }

  polylineTrayectoria = L.polyline(puntosTrayectoria, {
    color: "#6c5ce7",
    weight: 6,
    opacity: 0.9
  }).addTo(map);

  const posMoto = normalizarPunto(viaje.motorista?.ubicacion);
  if (posMoto) {
    crearOMoverMotorista(posMoto);
    agregarPuntoTrayectoria(posMoto);
    bounds.push(posMoto);
  }

  if (bounds.length > 1) {
    map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
  }
}

function actualizarMotorista(pos = {}) {
  const nuevaPos = normalizarPunto(pos);
  if (!nuevaPos || !map) return;

  const key = `${pos.viajeId || ""}:${pos.estado || ""}:${nuevaPos[0].toFixed(6)}:${nuevaPos[1].toFixed(6)}`;
  if (key === ultimoTrackKey && !pos.isSnapshot) return;
  ultimoTrackKey = key;

  crearOMoverMotorista(nuevaPos);
  agregarPuntoTrayectoria(nuevaPos);

  if (pos.estado) {
    setText("tripStatus", textoEstado(pos.estado));
  }

  if (!map.getBounds().pad(-0.25).contains(nuevaPos)) {
    map.panTo(nuevaPos, { animate: true, duration: 0.5 });
  }
}

function crearOMoverMotorista(latLng) {
  if (!motoristaMarker) {
    motoristaMarker = L.marker(latLng, { icon: iconoMoto() }).addTo(map);
    return;
  }

  motoristaMarker.setLatLng(latLng);
}

function agregarPuntoTrayectoria(latLng) {
  const ultimo = puntosTrayectoria[puntosTrayectoria.length - 1];
  if (ultimo && distanciaAprox(ultimo, latLng) < 2) return;

  puntosTrayectoria.push(latLng);
  if (polylineTrayectoria) {
    polylineTrayectoria.setLatLngs(puntosTrayectoria);
  }
}

function normalizarTrayectoria(trayectoria = []) {
  return trayectoria
    .map(normalizarPunto)
    .filter(Boolean);
}

function normalizarRuta(rutaPoints, origen, destino) {
  const ruta = Array.isArray(rutaPoints)
    ? rutaPoints.map(normalizarPunto).filter(Boolean)
    : [];

  return ruta.length > 1 ? ruta : [origen, destino].filter(Boolean);
}

function normalizarPunto(punto) {
  if (!punto) return null;

  const lat = Number(Array.isArray(punto) ? punto[0] : punto.lat);
  const lng = Number(Array.isArray(punto) ? punto[1] : punto.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

function iconoMoto() {
  return L.icon({
    iconUrl: "/assets/logo_moto.jpg",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: "moto-live-icon"
  });
}

function distanciaAprox(a, b) {
  const metrosLat = (a[0] - b[0]) * 111320;
  const metrosLng = (a[1] - b[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.sqrt(metrosLat * metrosLat + metrosLng * metrosLng);
}

function nombreMotorista(motorista = {}) {
  return [motorista.nombre, motorista.apellido].filter(Boolean).join(" ") || "Conductor";
}

function descripcionVehiculo(motorista = {}) {
  const vehiculo = motorista.vehiculo || {};
  return [vehiculo.marca || motorista.vehiculoMarca || "Moto", vehiculo.modelo || motorista.vehiculoModelo || ""]
    .filter(Boolean)
    .join(" ");
}

function placaMotorista(motorista = {}) {
  return motorista.placa || motorista.vehiculo?.placa || "S/P";
}

function textoEstado(estado) {
  const textos = {
    reservado: "Motorista reservado",
    asignado: "Moto en camino",
    llego: "El motorista llego",
    en_curso: "Viaje en curso",
    finalizado: "Viaje finalizado"
  };

  return textos[estado] || "Seguimiento en vivo";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function mostrarError(message) {
  setText("tripStatus", message);
  alert(message);
}
