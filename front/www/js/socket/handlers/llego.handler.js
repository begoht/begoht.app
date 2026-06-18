import { viajeState } from "../../viaje/viaje.state.js";
import {
  mostrarNotificacionLlegada,
  actualizarEstadoLlegada,
  reproducirSonidoLlegada
} from "../../pasajero/pasajero.ui.js";
import { actualizarUIDriver } from "../pasajero.utils.js?v=20260618-passenger-map-full";
import { actualizarRutaSegunEstado } from "../../map/map.route.flow.js?v=20260618-passenger-map-full";
import { viajeFueFinalizado } from "../../viaje/viaje.finalizado.local.js?v=20260615-smooth-autofinish";

export const handleLlego = (data = {}) => {
  console.log("Motorista llego:", data);

  if (data.viajeId && viajeFueFinalizado(data.viajeId)) {
    console.warn("Llegada ignorada: viaje ya finalizado", data.viajeId);
    return;
  }

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
