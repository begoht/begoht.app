import { viajeState } from "../../viaje/viaje.state.js";
import { manejarCancelacionOLimpieza } from "../pasajero.utils.js";

export const handleCancelado = ({ viajeId, penalidad, reembolso, busquedaAnulada }) => {
  console.log("Viaje cancelado:", viajeId, "| Penalidad:", penalidad, "Reembolso:", reembolso);
  const eraBusqueda = ["buscando", "ofertando"].includes(viajeState.estado);
  viajeState.cancelado = !busquedaAnulada && !eraBusqueda;
  manejarCancelacionOLimpieza(true);
};
