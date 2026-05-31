import { getSocket } from "../socket/socket.js";
import { viajeState } from "./viaje.state.js";
import { limpiarViajePasajero } from "../socket/viaje.limpieza.js";
import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js";
import { cerrarBuscandoMotorista } from "../pasajero/ui/overlays/buscandoMotorista.ui.js";
import { cityConfig } from "../map/config/index.js";

let socket = null;

function getSafeSocket() {
  if (!socket) socket = getSocket();
  return socket;
}

/**
 * 💸 Pedir viaje
 */
export function pedirViaje() {
  if (viajeState.activo || !viajeState.origen || !viajeState.destino) return;

  const socket = getSafeSocket();
  if (!socket) return;

  const datosViaje = {
    origen: viajeState.origen,
    destino: viajeState.destino,
    metodoPago: viajeState.metodoPago || "efectivo",
    city: cityConfig.id
  };

  Object.assign(viajeState, {
    activo: true,
    buscando: false,
    precioConfirmado: false
  });

  actualizarBotonViaje();

  localStorage.setItem("viajeActivo", JSON.stringify({
    ...datosViaje,
    estado: "cotizando"
  }));

  socket.emit("pedir-viaje", datosViaje);
}

/**
 * 🛑 Cancelar viaje
 */
export function cancelarViaje() {
  const socket = getSafeSocket();

  if (viajeState.viajeId && socket) {
    socket.emit("cancelar-viaje", { viajeId: viajeState.viajeId });
  }

  cerrarBuscandoMotorista();
  limpiarViajePasajero(); // 🔥 limpieza TOTAL

  actualizarBotonViaje();
}
