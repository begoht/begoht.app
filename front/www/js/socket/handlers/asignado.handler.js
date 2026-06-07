import { viajeState } from "../../viaje/viaje.state.js";
import { cerrarBuscandoMotorista, animarMotoristaEncontrado } from "../../pasajero/pasajero.ui.js";
import { actualizarBotonViaje } from "../../pasajero/ui/boton/botonViaje.ui.js?v=20260606-legal-trust";
import { limpiarMotoristas, mostrarMotoristaEnMapa } from "../../map/map.motorista.js?v=20260604-jacmel-gps";
import { mostrarDestinoEnMapa } from "../../map/map.destino.js";
import { guardarSesionViaje, actualizarUIDriver } from "../pasajero.utils.js?v=20260607-finalized-guard";
import { actualizarRutaSegunEstado } from "../../map/map.route.flow.js?v=20260604-jacmel-gps";
import { viajeFueFinalizado } from "../../viaje/viaje.finalizado.local.js?v=20260607-finalized-guard";

const ORDEN_ESTADO = {
  asignado: 1,
  reservado: 1,
  llego: 2,
  en_curso: 3,
  finalizado: 4,
  cancelado: 4
};

export const handleAsignado = (data = {}) => {
  console.log("Motorista asignado:", data);

  const estadoEntrante = data.estado || "asignado";

  if (data.viajeId && viajeFueFinalizado(data.viajeId)) {
    console.warn("Asignacion ignorada: viaje ya finalizado", data.viajeId);
    return;
  }

  if (
    data.viajeId &&
    viajeState.viajeId &&
    data.viajeId !== viajeState.viajeId
  ) {
    console.warn("Asignacion vieja ignorada");
    return;
  }

  if (
    viajeState.estado &&
    (ORDEN_ESTADO[estadoEntrante] || 0) < (ORDEN_ESTADO[viajeState.estado] || 0)
  ) {
    console.warn("Asignacion regresiva ignorada:", estadoEntrante);
    return;
  }

  cerrarBuscandoMotorista();
  animarMotoristaEncontrado();
  limpiarMotoristas();

  const motoristaInfo = {
    ...(viajeState.motorista || {}),
    ...(data.motorista || {}),
    heading: data.motorista?.heading ?? data.heading ?? viajeState.motorista?.heading ?? null
  };

  Object.assign(viajeState, {
    estado: estadoEntrante,
    viajeId: data.viajeId,
    precio: data.precio ?? viajeState.precio ?? null,
    distanciaKm: data.distanciaKm ?? viajeState.distanciaKm ?? null,
    duracionMin: data.duracionMin ?? viajeState.duracionMin ?? null,
    metodoPago: data.metodoPago ?? viajeState.metodoPago ?? null,
    estadoPago: data.estadoPago ?? viajeState.estadoPago ?? null,
    tipoServicio: data.tipo || viajeState.tipoServicio || "viaje",
    paquete: data.paquete || viajeState.paquete || null,
    motorista: motoristaInfo,
    buscando: false,
    asignado: ["asignado", "reservado", "llego"].includes(estadoEntrante),
    activo: true,
    precioConfirmado: true,
    llego: false,
    enCurso: estadoEntrante === "en_curso",
    metodoPagosaldoBloqueado: true,
    origen: data.origen,
    destino: data.destino,
    proximoDestino: data.proximoDestino || null
  });

  guardarSesionViaje(estadoEntrante);
  actualizarBotonViaje();
  mostrarDestinoEnMapa(data.destino);

  if (motoristaInfo?.lat != null) {
    mostrarMotoristaEnMapa(motoristaInfo);
  }

  actualizarUIDriver(motoristaInfo, estadoEntrante, {
    viajeId: data.viajeId,
    precio: data.precio,
    distanciaKm: data.distanciaKm,
    duracionMin: data.duracionMin,
    metodoPago: data.metodoPago,
    estadoPago: data.estadoPago,
    tipoServicio: data.tipo || viajeState.tipoServicio || "viaje",
    paquete: data.paquete || viajeState.paquete || null,
    origen: data.origen,
    destino: data.destino,
    proximoDestino: data.proximoDestino || null,
    eta: data.eta,
    distancia: data.distancia
  });

  if (!data.fromEstadoGlobal) {
    actualizarRutaSegunEstado({
      estado: estadoEntrante,
      motorista: motoristaInfo,
      origen: data.origen,
      destino: data.destino,
      proximoDestino: data.proximoDestino || null
    });
  }

  if (data.viajeId) {
    window.socket.emit("join-room", `track:${data.viajeId}`);
  }
};
