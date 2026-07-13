import { viajeState } from "../../viaje/viaje.state.js";
import { mostrarBusquedaSinMotorista } from "../../pasajero/pasajero.ui.js?v=20260608-search-modal";
import { manejarCancelacionOLimpieza } from "../pasajero.utils.js?v=20260713-live-trip-tracking";

export const handleNoMotorista = (data = {}) => {
  if (viajeState.estado === "en_curso" || viajeState.estado === "asignado") {
    console.warn("No-motorista ignorado: viaje ya activo");
    return;
  }

  manejarCancelacionOLimpieza();
  mostrarBusquedaSinMotorista(data);
};
