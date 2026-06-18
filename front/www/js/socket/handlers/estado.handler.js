import { viajeState } from "../../viaje/viaje.state.js";
import { handleAsignado } from "./asignado.handler.js";
import { handleIniciado } from "./iniciado.handler.js";
import { handleLlego } from "./llego.handler.js";
import { actualizarRutaSegunEstado } from "../../map/map.route.flow.js?v=20260618-map-ref-reserve";
import { viajeFueFinalizado } from "../../viaje/viaje.finalizado.local.js?v=20260615-smooth-autofinish";

export const handleEstado = (data) => {
  if (data?.viajeId && viajeFueFinalizado(data.viajeId)) {
    console.warn("Estado ignorado: viaje ya finalizado", data.viajeId);
    return;
  }

  if (!data || !data.estado) return;
  const { estado } = data;

  console.log("🔥 Estado realtime:", estado);

  // 1. Primero ejecutamos el handler específico para que viajeState se llene
  switch (estado) {
    case "asignado":
    case "reservado":
      handleAsignado({ ...data, fromEstadoGlobal: true });
      break;
    case "en_curso":
      handleIniciado({ ...data, fromEstadoGlobal: true });
      break;
    case "llego":
      handleLlego({ ...data, fromEstadoGlobal: true });
      break;
  }

  // 2. AHORA que viajeState ya tiene motorista, origen y destino, dibujamos la ruta
  actualizarRutaSegunEstado({
    estado,
    motorista: viajeState.motorista,
    origen: viajeState.origen,
    destino: viajeState.destino,
    proximoDestino: data.proximoDestino || viajeState.proximoDestino || null
  });
};
