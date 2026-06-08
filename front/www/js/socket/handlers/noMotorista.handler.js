import { viajeState } from "../../viaje/viaje.state.js";
import { mostrarBusquedaSinMotorista } from "../../pasajero/pasajero.ui.js?v=20260608-search-modal";
import { manejarCancelacionOLimpieza } from "../pasajero.utils.js";

export const handleNoMotorista = (data = {}) => {
  if (viajeState.estado === "en_curso" || viajeState.estado === "asignado") {
    console.warn("No-motorista ignorado: viaje ya activo");
    return;
  }

  manejarCancelacionOLimpieza();
  mostrarBusquedaSinMotorista(data);
};
