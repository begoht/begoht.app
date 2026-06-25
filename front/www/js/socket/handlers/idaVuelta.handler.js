import { viajeState } from "../../viaje/viaje.state.js";
import { actualizarRutaSegunEstado, resetRutaController } from "../../map/map.route.flow.js?v=20260625-map-instant";
import { mostrarDestinoEnMapa } from "../../map/map.destino.js?v=20260625-map-instant";
import { guardarSesionViaje, actualizarUIDriver } from "../pasajero.utils.js?v=20260625-map-instant";

export function handleIdaVueltaPendiente(data = {}, socket = null) {
  if (!esViajeActual(data)) return;

  aplicarPayload(data);
  cerrarDecisionRetorno();
  socket?.emit?.("ida-vuelta:iniciar-retorno", {
    viajeId: data.viajeId || viajeState.viajeId
  });
  notificar("La vuelta ya estaba seleccionada. Iniciando regreso.");
}

export function handleRetornoIniciado(data = {}) {
  if (!esViajeActual(data)) return;

  cerrarDecisionRetorno();
  aplicarPayload(data, "en_curso");
  resetRutaController();

  mostrarDestinoEnMapa(viajeState.proximoDestino || viajeState.origen);
  actualizarRutaSegunEstado({
    estado: "en_curso",
    motorista: viajeState.motorista,
    origen: viajeState.origen,
    destino: viajeState.destino,
    proximoDestino: viajeState.proximoDestino || viajeState.origen || null
  });

  notificar("La vuelta empezo. El motorista va de regreso al origen.");
}

export function handleRetornoAnulado(data = {}) {
  if (!esViajeActual(data)) return;

  cerrarDecisionRetorno();
  aplicarPayload(data);
  if (data.idaVuelta?.precioIda) viajeState.precio = data.idaVuelta.precioIda;
  notificar("La vuelta fue anulada. Se cobrara solo la ida.");
}

function aplicarPayload(data = {}, estado = null) {
  Object.assign(viajeState, {
    viajeId: data.viajeId || viajeState.viajeId,
    estado: estado || data.estado || viajeState.estado,
    origen: data.origen || viajeState.origen,
    destino: data.destino || viajeState.destino,
    proximoDestino: data.proximoDestino || viajeState.proximoDestino || null,
    idaVuelta: data.idaVuelta || viajeState.idaVuelta || null,
    precio: data.precio ?? viajeState.precio,
    precioBase: data.precioBase ?? viajeState.precioBase,
    distanciaKm: data.distanciaKm ?? viajeState.distanciaKm,
    duracionMin: data.duracionMin ?? viajeState.duracionMin,
    metodoPago: data.metodoPago ?? viajeState.metodoPago,
    estadoPago: data.estadoPago ?? viajeState.estadoPago,
    activo: true,
    enCurso: (estado || data.estado || viajeState.estado) === "en_curso"
  });

  guardarSesionViaje(viajeState.estado || "en_curso");
  actualizarUIDriver(viajeState.motorista, viajeState.estado || "en_curso", {
    idaVuelta: viajeState.idaVuelta,
    proximoDestino: viajeState.proximoDestino
  });
}

function esViajeActual(data = {}) {
  if (!data?.viajeId || !viajeState.viajeId) return true;
  return String(data.viajeId) === String(viajeState.viajeId);
}

function cerrarDecisionRetorno() {
  document.getElementById("modalIdaVueltaDecision")?.remove();
}

function notificar(text) {
  if (typeof Toastify === "function") {
    Toastify({
      text,
      duration: 4200,
      gravity: "top",
      position: "center",
      style: {
        background: "linear-gradient(135deg, #2563eb, #0891b2)",
        color: "#fff",
        fontWeight: "900",
        borderRadius: "12px"
      }
    }).showToast();
    return;
  }

  console.log(text);
}
