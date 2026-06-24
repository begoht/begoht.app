import {
  getViajeEnCursoId,
  setEstadoViaje,
  setViajeEnCurso,
  viajesActivos
} from "../viajeControl/viajeEstado.js";
import { reconstruirUIDesdeEstado } from "../viajeControl/viajeUI.js?v=20260623-roundtrip-v2";
import { getUltimaPosicion } from "../gps.js?v=20260624-matching-heartbeat";
import { dibujarRutaPremium } from "../map.js?v=20260624-map-light";

let socketRef = null;
let clicksBound = false;

export function initIdaVueltaDriver(socket) {
  if (!socket) return;
  socketRef = socket;

  socket.off("ida-vuelta:pendiente", onRetornoPendiente);
  socket.off("ida-vuelta:retorno-iniciado", onRetornoIniciado);
  socket.off("ida-vuelta:retorno-anulado", onRetornoAnulado);

  socket.on("ida-vuelta:pendiente", onRetornoPendiente);
  socket.on("ida-vuelta:retorno-iniciado", onRetornoIniciado);
  socket.on("ida-vuelta:retorno-anulado", onRetornoAnulado);

  if (!clicksBound) {
    document.addEventListener("click", onClickIdaVuelta);
    clicksBound = true;
  }
}

function onRetornoPendiente(data = {}) {
  const viaje = guardarViajeIdaVuelta(data, "retorno_pendiente");
  if (!viaje) return;

  setEstadoViaje("en_curso");
  reconstruirUIDesdeEstado();
  notificar("Llegaste al destino. Confirma si el pasajero hace la vuelta.");
}

function onRetornoIniciado(data = {}) {
  const viaje = guardarViajeIdaVuelta(data, "retorno_en_curso");
  if (!viaje) return;

  setEstadoViaje("en_curso");
  reconstruirUIDesdeEstado();

  const pos = getUltimaPosicion();
  const target = data.proximoDestino || viaje.origen;
  if (pos && target) {
    setTimeout(() => dibujarRutaPremium(pos, target), 250);
  }

  notificar("Vuelta iniciada hacia el origen.");
}

function onRetornoAnulado(data = {}) {
  const viaje = guardarViajeIdaVuelta(data, "retorno_cancelado");
  if (!viaje) return;

  if (data.idaVuelta?.precioIda) {
    viaje.precio = data.idaVuelta.precioIda;
  }

  viajesActivos.set(viaje.viajeId, viaje);
  reconstruirUIDesdeEstado();
  notificar("Vuelta anulada. Se cobrara solo la ida.");
}

function onClickIdaVuelta(event) {
  const iniciar = event.target.closest("#btnIniciarVuelta");
  const anular = event.target.closest("#btnAnularVuelta");
  if (!iniciar && !anular) return;

  const viajeId = normalizarId(getViajeEnCursoId());
  if (!viajeId || !socketRef) return;

  if (iniciar) {
    iniciar.disabled = true;
    socketRef.emit("ida-vuelta:iniciar-retorno", { viajeId });
    return;
  }

  if (anular) {
    if (!confirm("Confirmer que le passager annule la vuelta?")) return;

    const pos = getUltimaPosicion() || {};
    anular.disabled = true;
    socketRef.emit("ida-vuelta:anular-retorno", {
      viajeId,
      lat: pos.lat,
      lng: pos.lng
    });
  }
}

function guardarViajeIdaVuelta(data = {}, estadoIdaVuelta) {
  const viajeId = normalizarId(data.viajeId || getViajeEnCursoId());
  if (!viajeId) return null;

  const existente = viajesActivos.get(viajeId) || {};
  const idaVuelta = {
    ...(existente.idaVuelta || {}),
    ...(data.idaVuelta || {}),
    estado: data.idaVuelta?.estado || estadoIdaVuelta
  };

  const viaje = {
    ...existente,
    ...data,
    id: viajeId,
    viajeId,
    estado: "en_curso",
    idaVuelta,
    proximoDestino: data.proximoDestino || existente.proximoDestino || null
  };

  setViajeEnCurso(viajeId);
  viajesActivos.set(viajeId, viaje);
  return viaje;
}

function normalizarId(id) {
  if (id == null) return null;
  const value = String(id).trim();
  return value && value !== "null" && value !== "undefined" ? value : null;
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
