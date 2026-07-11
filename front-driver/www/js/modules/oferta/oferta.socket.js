import { renderOferta, limpiarOferta } from "./oferta.render.js?v=20260702-offer-recovery";
import { agregarACola } from "./oferta.queue.js";
import { seenOfertas, ofertaState, CONFIG, getViajeId, getOfertaExpiraEn } from "./oferta.state.js";
import { notificar, reproducirSonido } from "./oferta.ui.js?v=20260608-offer-net-cash";
import { registrarViaje } from "../viajeControl/viajeControl.js?v=20260608-offer-net-cash";
import { setViajeEnCurso } from "../viajeControl/viajeEstado.js";
import { dibujarRutaPremium } from "../map.js?v=20260710-route-icons";
import { getUltimaPosicion, refreshDriverLocation } from "../gps.js?v=20260711-driver-gps-modular";
import { isDriverOnline } from "../driver.status.js?v=20260627-map-icons";
import { normalizarPunto, notificarGuardia } from "../tripGuards.js?v=20260627-map-fluid-arrival";

const viajesTomadosProcesados = new Set();

let initialized = false;

export function initSocketEventos(socket) {

  if (initialized) return;

  initialized = true;
  
  // ============================
  // 🚀 NUEVA OFERTA
  // ============================
  const handleIncomingOffer = (viaje) => {
  if (!isDriverOnline()) {
    limpiarOferta({ resetViaje: true });
    return;
  }

  const id = getViajeId(viaje);
  if (!id || getOfertaExpiraEn(viaje) <= Date.now() || seenOfertas.has(id)) return;

  viaje.expira = getOfertaExpiraEn(viaje);

  seenOfertas.add(id);
  setTimeout(() => seenOfertas.delete(id), CONFIG.DEDUPLICACION_TTL);

  const ahora = Date.now();
  const enCooldown = (ahora - ofertaState.lastDecisionTs < CONFIG.DECISION_COOLDOWN);
  const bloqueado = ofertaState.aceptando;

  if (enCooldown || bloqueado) {
    console.log(`[QUEUE] Viaje ${id} enviado a cola`);
    agregarACola(viaje);
    return;
  }

  const esReserva = ofertaState.viajeActual !== null;

  // 🔥 NO setear viajeMostradoId aquí
  renderOferta(viaje, { esReserva });
  };

  socket.on("viaje:oferta", handleIncomingOffer);
  window.addEventListener("driver:offer-recovered", ({ detail }) => {
    handleIncomingOffer(detail);
  });
  // ============================
  // ✅ VIAJE CONFIRMADO
  // ============================
  socket.on("viaje-confirmado-motorista", ({ viaje }) => {

    if (ofertaState.failSafeTimer) clearTimeout(ofertaState.failSafeTimer);

    const vId = getViajeId(viaje);

    ofertaState.viajeActual = vId;
    ofertaState.viajeMostradoId = null; // 🔥 limpiar mostrado

    registrarViaje(vId, viaje);
    setViajeEnCurso(vId);

    trazarRutaAlPunto(viaje.origen);

    limpiarOferta({ resetViaje: false });

    notificar("✅ Viaje confirmado.");
  });

  // ============================
  // 📅 RESERVA CONFIRMADA
  // ============================
  socket.on("viaje-siguiente-confirmado", (data = {}) => {

    if (ofertaState.failSafeTimer) clearTimeout(ofertaState.failSafeTimer);

    const viajeReserva = data.viaje || data;
    const viajeId = getViajeId(viajeReserva) || data.viajeId;

    registrarViaje(viajeId, { ...viajeReserva, estado: "reservado" });

    ofertaState.viajeMostradoId = null;

    limpiarOferta({ resetViaje: false });

    notificar("📅 Reserva confirmada", "#3b82f6");
  });

  // ============================
  // 🚀 ACTIVAR RESERVA
  // ============================
  socket.on("iniciar-viaje-siguiente", (data) => {

    const vId = getViajeId(data);

    ofertaState.viajeActual = vId;
    ofertaState.viajeMostradoId = null;

    setViajeEnCurso(vId);
    registrarViaje(vId, { ...data, estado: "asignado" });

    setTimeout(() => trazarRutaAlPunto(data.origen), 500);

    notificar("🚀 ¡Reserva activada!", "#8b5cf6");
    reproducirSonido();
  });

  // ============================
  // 🛑 CANCELADO
  // ============================
  socket.on("viaje:cancelado", (data) => {

    console.log("🛑 Viaje cancelado:", data.viajeId);

    ofertaState.viajeActual = null;
    ofertaState.aceptando = false;
    ofertaState.viajeMostradoId = null;

    limpiarOferta({ resetViaje: true });

    notificar("🛑 El viaje fue cancelado", "#f59e0b");
  });

  // ============================
  // ❌ YA TOMADO (legacy)
  // ============================
  socket.off("viaje:oferta-cerrada");
  socket.on("viaje:oferta-cerrada", ({ viajeId } = {}) => {
    const mostrado = getViajeId(ofertaState.viajeMostradoId);
    if (viajeId && mostrado && mostrado !== getViajeId(viajeId)) return;

    ofertaState.aceptando = false;
    ofertaState.viajeMostradoId = null;

    if (ofertaState.failSafeTimer) {
      clearTimeout(ofertaState.failSafeTimer);
    }

    limpiarOferta({ resetViaje: false });
  });

  socket.on("viaje-ya-tomado", () => {

    if (ofertaState.failSafeTimer) clearTimeout(ofertaState.failSafeTimer);

    ofertaState.viajeMostradoId = null;

    limpiarOferta();

    notificar("❌ El viaje ya fue tomado", "#ef4444");
  });

  // ============================
  // 🔥 VIAJE TOMADO (CORRECTO)
  // ============================
  socket.off("viaje:tomado");
  socket.on("viaje:tomado", ({ viajeId }) => {
    viajeId = getViajeId(viajeId);
    
    if (!viajeId) return;
    
    // 🔥 DEDUPE
    if (viajesTomadosProcesados.has(viajeId)) {
      return;
    }
    
    viajesTomadosProcesados.add(viajeId);
    
    setTimeout(() => {
      viajesTomadosProcesados.delete(viajeId);
    }, 5000);
    
    const mostrado = getViajeId(ofertaState.viajeMostradoId);
    const actual = getViajeId(ofertaState.viajeActual);
    
    if (
      mostrado === viajeId ||
      actual === viajeId
    ) {
      
      console.log("🧹 Oferta cerrada por otro motorista");
      
      if (ofertaState.failSafeTimer) {
        clearTimeout(ofertaState.failSafeTimer);
      }
      
      ofertaState.aceptando = false;
      ofertaState.viajeMostradoId = null;
      
      limpiarOferta({
        resetViaje: false
      });
      
      notificar("🚫 Este viaje fue tomado", "#ef4444");
    }
  });
}

async function trazarRutaAlPunto(punto) {
  const destino = normalizarPunto(punto);

  if (!destino) {
    notificarGuardia("Impossible de tracer la route: point de depart invalide.", "#f59e0b");
    return false;
  }

  let origen = normalizarPunto(getUltimaPosicion());

  if (!origen) {
    await refreshDriverLocation({ force: true });
    origen = normalizarPunto(getUltimaPosicion());
  }

  if (!origen) {
    notificarGuardia("Active le GPS pour tracer la route.", "#ef4444");
    return false;
  }

  return dibujarRutaPremium(origen, destino);
}
