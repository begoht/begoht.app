import { getSocket } from "../socket/socket.js?v=20260606-session-refresh";
import { viajeState } from "./viaje.state.js";
import { limpiarViajePasajero } from "../socket/viaje.limpieza.js";
import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js?v=20260606-payment-methods";
import { cerrarBuscandoMotorista } from "../pasajero/ui/overlays/buscandoMotorista.ui.js?v=20260605-price-premium-cancel";
import { cityConfig } from "../map/config/index.js";

let socket = null;
let cotizacionTimer = null;
const COTIZACION_TIMEOUT_MS = 15000;

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
export function pedirViaje() {
  if (viajeState.cotizando || viajeState.estado === "cotizando") return;
  if (viajeState.activo || !viajeState.origen || !viajeState.destino) return;

  const socket = getSafeSocket();
  if (!socket || socket.connected === false) {
    resetCotizacionPendiente();
    alert("Conexion no disponible. Intenta nuevamente en unos segundos.");
    return;
  }

  const quoteId = crearQuoteId();

  const datosViaje = {
    quoteId,
    origen: viajeState.origen,
    destino: viajeState.destino,
    metodoPago: viajeState.metodoPago || metodoPagoDisponiblePorDefecto(),
    city: cityConfig.id,
    tipo: viajeState.tipoServicio || "viaje",
    paquete: viajeState.tipoServicio === "envio" ? viajeState.paquete : null
  };

  Object.assign(viajeState, {
    activo: true,
    cotizando: true,
    buscando: false,
    estado: "cotizando",
    viajeId: null,
    quoteId,
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
