import { viajeState } from "../../viaje/viaje.state.js";
import {
  mostrarNotificacionProximidad,
  actualizarEstadoProximidad,
  reproducirSonidoLlegada
} from "../../pasajero/pasajero.ui.js?v=20260628-dark-route-locked";

const avisosMostrados = new Set();

export const handleProximidad = (data = {}) => {
  const viajeId = data.viajeId || viajeState.viajeId;

  if (!viajeId || !viajeState.viajeId || viajeId !== viajeState.viajeId) {
    return;
  }

  if (["llego", "en_curso", "finalizado", "cancelado"].includes(viajeState.estado)) {
    return;
  }

  if (avisosMostrados.has(viajeId)) {
    return;
  }

  avisosMostrados.add(viajeId);
  mostrarNotificacionProximidad(data);
  actualizarEstadoProximidad(data);
  reproducirSonidoLlegada();
};

export function resetProximidadAvisos() {
  avisosMostrados.clear();
}
