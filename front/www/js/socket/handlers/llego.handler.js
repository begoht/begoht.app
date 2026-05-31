import { viajeState } from "../../viaje/viaje.state.js";
import {
  mostrarNotificacionLlegada,
  actualizarEstadoLlegada,
  reproducirSonidoLlegada
} from "../../pasajero/pasajero.ui.js";
import { actualizarUIDriver } from "../pasajero.utils.js";
import { actualizarRutaSegunEstado } from "../../map/map.route.flow.js";

export const handleLlego = (data = {}) => {
  console.log("Motorista llego:", data);

  if (!viajeState.viajeId) {
    console.warn("Evento llego ignorado: no hay viaje");
    return;
  }

  if (
    data.viajeId &&
    viajeState.viajeId &&
    data.viajeId !== viajeState.viajeId
  ) {
    console.warn("Evento llego viejo ignorado");
    return;
  }

  if (viajeState.estado === "llego") {
    console.log("Evento llego duplicado ignorado");
    return;
  }

  Object.assign(viajeState, {
    estado: "llego",
    llego: true,
    enCurso: false,
    activo: true
  });

  mostrarNotificacionLlegada(data);
  actualizarEstadoLlegada();
  reproducirSonidoLlegada();
  actualizarUIDriver(viajeState.motorista, "llego");

  actualizarRutaSegunEstado({
    estado: "llego",
    motorista: viajeState.motorista,
    origen: viajeState.origen,
    destino: viajeState.destino
  });
};
