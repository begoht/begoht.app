import { ofertaState, setLastDecision, getViajeId, CONFIG } from "./oferta.state.js";
import { UI, notificar } from "./oferta.ui.js?v=20260608-offer-net-cash";
import { getUltimaPosicion } from "../gps.js?v=20260606-recenter-map";
import { limpiarOferta } from "./oferta.render.js?v=20260608-offer-net-cash";
import { isDriverOnline } from "../driver.status.js?v=20260608-offer-net-cash";

export function aceptarViaje(socket) {
  if (!isDriverOnline()) {
    limpiarOferta();
    return notificar("Conectate para aceptar viajes.", "#f59e0b");
  }

  // LEER DESDE EL OBJETO DE ESTADO
  const vId = ofertaState.viajeMostradoId;
  
  if (!vId || ofertaState.aceptando) return;
  
  const pos = getUltimaPosicion();
  if (!pos) return notificar("⚠️ GPS no detectado.", "#ef4444");

  setLastDecision(Date.now());
  ofertaState.aceptando = true;
  
  if (UI.btnAceptar) {
    UI.btnAceptar.disabled = true;
    UI.btnAceptar.innerHTML = "Traitement...";
  }

  ofertaState.failSafeTimer = setTimeout(() => {
    if (ofertaState.aceptando) {
      limpiarOferta();
      notificar("⏳ Sin respuesta del servidor.", "#ef4444");
    }
  }, CONFIG.FAILSAFE_TIMEOUT || 12000);

  socket.emit("motorista-aceptar-viaje", { 
    viajeId: vId, 
    lat: pos.lat, 
    lng: pos.lng 
  }, (res) => {
    
    clearTimeout(ofertaState.failSafeTimer);
    
    if (!res?.ok) {
      ofertaState.aceptando = false;
      limpiarOferta();
      notificar(res?.msj || "Error al tomar viaje", "#ef4444");
    }
    // Si es OK, no hacemos nada aquí, esperamos el evento 
    // "viaje-confirmado-motorista" en el socket.js
  });
}

export function rechazarViaje(socket) {
  const vId = getViajeId(ofertaState.viajeActual);
  setLastDecision(Date.now());
  
  if (vId) {
    socket.emit("motorista-rechazar-viaje", { viajeId: vId });
  }
  
  limpiarOferta();
}
