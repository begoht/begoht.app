import { viajeState } from "../../viaje/viaje.state.js";
import {
  mostrarNotificacionLlegada,
  actualizarEstadoLlegada,
  reproducirSonidoLlegada
} from "../../pasajero/pasajero.ui.js?v=20260628-dark-route-locked";
import { actualizarUIDriver } from "../pasajero.utils.js?v=20260710-photo-fix";
import { actualizarRutaSegunEstado } from "../../map/map.route.flow.js?v=20260710-route-camera";
import { ocultarOrigenEnMapa } from "../../map/map.geo.js?v=20260628-dark-route-locked";
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
  ocultarOrigenEnMapa();

  actualizarRutaSegunEstado({
    estado: "llego",
    motorista: viajeState.motorista,
    origen: viajeState.origen,
    destino: viajeState.destino
  });
};

