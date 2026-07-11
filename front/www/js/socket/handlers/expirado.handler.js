import { viajeState } from "../../viaje/viaje.state.js";
import { manejarCancelacionOLimpieza } from "../pasajero.utils.js?v=20260711-passenger-profile-photo-utils";

export const handleExpirado = ({ viajeId }) => {
  // 1. Validación de seguridad
  // Si el viaje ya comenzó, ignoramos cualquier evento de expiración tardío
  if (viajeState.estado === "en_curso" || viajeState.estado === "llego") {
    console.warn("⛔ Expirado ignorado: El viaje ya está en fase activa");
    return;
  }

  // 2. Verificar que la expiración sea del viaje actual
  if (viajeId && viajeState.viajeId && viajeId !== viajeState.viajeId) {
    return; // Es una expiración de un ID viejo, ignorar
  }

  console.warn("⏳ Oferta de viaje expirada");
  
  // 3. Feedback al usuario (puedes cambiar el alert por un Toast más elegante)
  // alert("La oferta de precio ha expirado. Por favor, solicita de nuevo.");

  // 4. Limpieza total de la UI y el Mapa
  manejarCancelacionOLimpieza(true); 
};
