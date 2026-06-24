import { viajeState } from "../../viaje/viaje.state.js";
import { actualizarRutaSegunEstado, resetRutaController } from "../../map/map.route.flow.js?v=20260623-roundtrip-v2";
import { mostrarDestinoEnMapa } from "../../map/map.destino.js?v=20260624-trip-ready";
import { guardarSesionViaje, actualizarUIDriver } from "../pasajero.utils.js?v=20260623-roundtrip-v2";
import { viajeFueFinalizado } from "../../viaje/viaje.finalizado.local.js?v=20260615-smooth-autofinish";

let lastIniciadoViajeId = null;

export const handleIniciado = (data = {}) => {
  console.log("Motorista en camino al destino:", data);

  if (data.viajeId && viajeFueFinalizado(data.viajeId)) {
    console.warn("Inicio ignorado: viaje ya finalizado", data.viajeId);
    return;
  }

  if (
    data.viajeId &&
    viajeState.viajeId &&
    data.viajeId !== viajeState.viajeId
  ) {
    console.warn("Inicio de viaje viejo ignorado");
    return;
  }

  const esRetorno = data.idaVuelta?.estado === "retorno_en_curso";

  if (viajeState.estado === "en_curso" && lastIniciadoViajeId === viajeState.viajeId && !esRetorno) {
    console.log("Inicio de viaje duplicado ignorado");
    return;
  }

  const cambioFase = viajeState.estado !== "en_curso";
  lastIniciadoViajeId = data.viajeId || viajeState.viajeId;

  Object.assign(viajeState, {
    estado: "en_curso",
    activo: true,
    asignado: false,
    enCurso: true,
    llego: false,
    origen: data.origen || viajeState.origen,
    destino: data.destino || viajeState.destino,
    tipoServicio: data.tipo || viajeState.tipoServicio || "viaje",
    paquete: data.paquete || viajeState.paquete || null,
    idaVuelta: data.idaVuelta || viajeState.idaVuelta || null,
    proximoDestino: data.proximoDestino || data.destino || viajeState.destino || null
  });

  if (cambioFase) {
    resetRutaController();
  }

  guardarSesionViaje("en_curso");
  actualizarUIDriver(viajeState.motorista, "en_curso", {
    idaVuelta: viajeState.idaVuelta,
    proximoDestino: viajeState.proximoDestino
  });
  mostrarDestinoEnMapa(viajeState.proximoDestino || viajeState.destino);

  actualizarRutaSegunEstado({
    estado: "en_curso",
    motorista: viajeState.motorista,
    origen: viajeState.origen,
    destino: viajeState.destino,
    proximoDestino: viajeState.proximoDestino || null
  });
};
