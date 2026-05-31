import { viajeState } from "../../viaje/viaje.state.js";
import { manejarCancelacionOLimpieza } from "../pasajero.utils.js";

export const handleError = ({ mensaje }) => {
  const estadosProtegidos = [
    "buscando",
    "reservado",
    "asignado",
    "llego",
    "en_curso"
  ];

  if (estadosProtegidos.includes(viajeState.estado)) {
    console.warn(`Error ignorado (${viajeState.estado})`);
    return;
  }

  alert(mensaje || "No pudimos completar la solicitud. Intenta nuevamente.");
  manejarCancelacionOLimpieza();
};
