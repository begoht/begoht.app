import { viajeState } from "../../viaje/viaje.state.js";
import { handleAsignado } from "./asignado.handler.js";
import { handleIniciado } from "./iniciado.handler.js";
import { handleLlego } from "./llego.handler.js";
import { actualizarRutaSegunEstado } from "../../map/map.route.flow.js";

export const handleEstado = (data) => {
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
