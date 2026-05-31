import { viajeState } from "../../viaje/viaje.state.js";
import { manejarCancelacionOLimpieza } from "../pasajero.utils.js";

export const handleNoMotorista = () => {
  if (viajeState.estado === "en_curso" || viajeState.estado === "asignado") {
    console.warn("⛔ No-motorista ignorado (viaje ya activo)");
    return;
  }

  alert("😕 No hay conductores disponibles");
  manejarCancelacionOLimpieza();
};
