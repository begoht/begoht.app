import { viajeState } from "../../viaje/viaje.state.js";
import { manejarCancelacionOLimpieza } from "../pasajero.utils.js";

export const handleCancelado = ({ viajeId, penalidad, reembolso, busquedaAnulada, estado, historial }) => {
  console.log("Viaje cancelado:", viajeId, "| Penalidad:", penalidad, "Reembolso:", reembolso);

  if (viajeId && viajeState.viajeId && viajeId !== viajeState.viajeId) {
    console.warn("Cancelacion ignorada para viaje viejo:", viajeId);
    return;
  }

  const eraBusqueda = ["buscando", "ofertando", "cotizando"].includes(viajeState.estado);
  const esAnulacionBusqueda =
    busquedaAnulada === true ||
    estado === "busqueda_anulada" ||
    historial === false ||
    eraBusqueda;

  viajeState.cancelado = !esAnulacionBusqueda && estado === "cancelado";

  if (esAnulacionBusqueda) {
    viajeState.estado = null;
    viajeState.cancelado = false;
    viajeState.precioConfirmado = false;
  }

  manejarCancelacionOLimpieza(true);
};
