import { getSocket } from "../socket/socket.js?v=20260606-session-refresh";
import { viajeState } from "./viaje.state.js";
import { limpiarViajePasajero } from "../socket/viaje.limpieza.js";
import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js?v=20260623-roundtrip-v2";
import { cerrarBuscandoMotorista } from "../pasajero/ui/overlays/buscandoMotorista.ui.js?v=20260608-search-modal";
import { cityConfig } from "../map/config/index.js?v=20260624-cordoba-gps";
import { reverseGeocode } from "../map/services/map.reverse.js?v=20260624-cordoba-gps";
import { getMap } from "../map/map.singleton.js?v=20260628-dark-route-locked";
import { asegurarOrigenGpsReal } from "../map/map.geo.js?v=20260628-dark-route-locked";

let socket = null;
let cotizacionTimer = null;
const COTIZACION_TIMEOUT_MS = 15000;
const DIRECCIONES_GENERICAS = new Set([
  "tu ubicacion actual",
  "ubicacion actual",
  "punto en el mapa",
  "punto seleccionado en mapa",
  "destino seleccionado",
  "destino guardado",
  "origen",
  "destino"
]);

function getSafeSocket() {
  if (!socket) socket = getSocket();
  return socket;
}

function crearQuoteId() {
  return `quote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function metodoPagoDisponiblePorDefecto() {
  const methods = window.__begoPaymentMethods || {};
  const preferred = ["efectivo", "wallet", "moncash", "natcash"]
    .find((id) => methods[id]?.enabled && methods[id]?.canPay);

  return preferred || "efectivo";
}

function normalizarTextoDireccion(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function esDireccionGenerica(value = "") {
  return DIRECCIONES_GENERICAS.has(normalizarTextoDireccion(value));
}

async function completarDireccion(punto, fallback) {
  if (!punto?.lat || !punto?.lng) return punto;
  if (punto.direccion && !esDireccionGenerica(punto.direccion)) return punto;

  try {
    const direccion = await reverseGeocode(Number(punto.lat), Number(punto.lng));
    return {
      ...punto,
      direccion: direccion && !esDireccionGenerica(direccion) ? direccion : (punto.direccion || fallback)
    };
  } catch {
    return {
      ...punto,
      direccion: punto.direccion || fallback
    };
  }
}

export function clearCotizacionTimer() {
  if (cotizacionTimer) {
    clearTimeout(cotizacionTimer);
    cotizacionTimer = null;
  }
}

export function resetCotizacionPendiente({ notify = false } = {}) {
  clearCotizacionTimer();

  Object.assign(viajeState, {
    activo: false,
    cotizando: false,
    buscando: false,
    asignado: false,
    estado: null,
    viajeId: null,
    quoteId: null,
    precio: null,
    precioBase: null,
    descuentoWallet: 0,
    descuentoWalletRate: 0,
    walletDiscount: null,
    idaVuelta: null,
    distanciaKm: null,
    duracionMin: null,
    precioConfirmado: false
  });

  localStorage.removeItem("viajeActivo");
  sessionStorage.removeItem("viajeActivo");
  actualizarBotonViaje();

  if (notify) {
    alert("No pudimos calcular el precio. Revisa tu conexion e intenta nuevamente.");
  }
}

export function resolverCotizacionPendiente(quoteId = null) {
  if (!viajeState.cotizando && viajeState.estado !== "cotizando") {
    return false;
  }

  if (quoteId && viajeState.quoteId && quoteId !== viajeState.quoteId) {
    return false;
  }

  clearCotizacionTimer();
  viajeState.cotizando = false;
  viajeState.estado = "cotizado";
  return true;
}

/**
 * 💸 Pedir viaje
 */
export async function pedirViaje() {
  if (viajeState.cotizando || viajeState.estado === "cotizando") return;
  if (viajeState.activo || !viajeState.destino) return;

  const gpsOk = await asegurarOrigenGpsReal(getMap(), {
    center: false,
    timeout: 12000,
    maxAgeMs: 8000
  });

  if (!gpsOk || !viajeState.origen) {
    alert("No pudimos tomar tu ubicacion real. Activa el GPS y vuelve a intentar.");
    actualizarBotonViaje();
    return;
  }

  if (viajeState.tipoServicio === "envio" && !viajeState.paquete?.reglasAceptadas) {
    alert("Vous devez accepter les regles des colis avant de continuer.");
    return;
  }

  const socket = getSafeSocket();
  if (!socket || socket.connected === false) {
    resetCotizacionPendiente();
    alert("Conexion no disponible. Intenta nuevamente en unos segundos.");
    return;
  }

  const quoteId = crearQuoteId();
  const [origen, destino] = await Promise.all([
    completarDireccion(viajeState.origen, "Ubicacion actual"),
    completarDireccion(viajeState.destino, "Destino seleccionado")
  ]);

  const datosViaje = {
    quoteId,
    origen,
    destino,
    metodoPago: viajeState.metodoPago || metodoPagoDisponiblePorDefecto(),
    city: cityConfig.id,
    tipo: viajeState.tipoServicio || "viaje",
    paquete: viajeState.tipoServicio === "envio" ? viajeState.paquete : null
  };

  Object.assign(viajeState, {
    origen,
    destino,
    activo: true,
    cotizando: true,
    buscando: false,
    estado: "cotizando",
    viajeId: null,
    quoteId,
    idaVuelta: null,
    precioConfirmado: false
  });

  actualizarBotonViaje();

  localStorage.setItem("viajeActivo", JSON.stringify({
    ...datosViaje,
    estado: "cotizando",
    precioConfirmado: false,
    timestamp: Date.now()
  }));

  clearCotizacionTimer();
  cotizacionTimer = setTimeout(() => {
    if (viajeState.quoteId === quoteId && viajeState.estado === "cotizando") {
      resetCotizacionPendiente({ notify: true });
    }
  }, COTIZACION_TIMEOUT_MS);

  socket.emit("pedir-viaje", datosViaje);
}

/**
 * 🛑 Cancelar viaje
 */
export function cancelarViaje() {
  const socket = getSafeSocket();
  clearCotizacionTimer();

  if (viajeState.viajeId && socket) {
    socket.emit("cancelar-viaje", { viajeId: viajeState.viajeId });
  }

  cerrarBuscandoMotorista();
  limpiarViajePasajero(); // 🔥 limpieza TOTAL

  actualizarBotonViaje();
}
