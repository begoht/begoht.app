import { viajeState } from "../../viaje/viaje.state.js";
import { actualizarRutaSegunEstado, resetRutaController } from "../../map/map.route.flow.js";
import { mostrarDestinoEnMapa } from "../../map/map.destino.js";
import { guardarSesionViaje, actualizarUIDriver } from "../pasajero.utils.js";

let lastIniciadoViajeId = null;

export const handleIniciado = (data = {}) => {
  console.log("Motorista en camino al destino:", data);

  if (
    data.viajeId &&
    viajeState.viajeId &&
    data.viajeId !== viajeState.viajeId
  ) {
    console.warn("Inicio de viaje viejo ignorado");
    return;
  }

  if (viajeState.estado === "en_curso" && lastIniciadoViajeId === viajeState.viajeId) {
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
    proximoDestino: data.proximoDestino || data.destino || viajeState.destino || null
  });

  if (cambioFase) {
    resetRutaController();
  }

  guardarSesionViaje("en_curso");
  actualizarUIDriver(viajeState.motorista, "en_curso");
  mostrarDestinoEnMapa(viajeState.destino);

  actualizarRutaSegunEstado({
    estado: "en_curso",
    motorista: viajeState.motorista,
    origen: viajeState.origen,
    destino: viajeState.destino
  });
};
