import { ofertaState, setLastDecision, getViajeId, CONFIG } from "./oferta.state.js";
import { UI, notificar, resetBotonAceptar } from "./oferta.ui.js?v=20260608-offer-net-cash";
import { getUltimaPosicion, setUltimaPosicion } from "../gps.js?v=20260624-matching-heartbeat";
import { limpiarOferta } from "./oferta.render.js?v=20260624-matching-heartbeat";
import { getDriverAvailability, isDriverOnline } from "../driver.status.js?v=20260624-matching-heartbeat";

export async function aceptarViaje(socket) {
  if (!isDriverOnline()) {
    limpiarOferta();
    return notificar("Connectez-vous pour accepter des courses.", "#f59e0b");
  }

  const vId = ofertaState.viajeMostradoId;
  if (!vId || ofertaState.aceptando) return;

  setLastDecision(Date.now());
  ofertaState.aceptando = true;

  if (UI.btnAceptar) {
    UI.btnAceptar.disabled = true;
    UI.btnAceptar.innerHTML = "Localisation...";
  }

  const pos = await obtenerPosicionParaAceptar();
  if (!pos) {
    ofertaState.aceptando = false;
    resetBotonAceptar();
    return notificar("Activez le GPS et reessayez.", "#ef4444");
  }

  if (socket?.connected) {
    socket.emit("motoristas:ubicacion", {
      lat: pos.lat,
      lng: pos.lng,
      heading: pos.heading ?? null,
      disponible: true,
      instant: true
    });
  }

  if (UI.btnAceptar) {
    UI.btnAceptar.innerHTML = "Traitement...";
  }

  ofertaState.failSafeTimer = setTimeout(() => {
    if (ofertaState.aceptando) {
      limpiarOferta();
      notificar("Temps d'attente depasse.", "#ef4444");
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
      notificar(res?.msj || "Impossible de prendre la course", "#ef4444");
    }
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

async function obtenerPosicionParaAceptar() {
  const cacheGPS = normalizarPosicion(getUltimaPosicion());
  if (cacheGPS) return cacheGPS;

  const estadoDriver = normalizarPosicion(getDriverAvailability()?.lastPosition);
  if (estadoDriver) return estadoDriver;

  const lecturaFresca = await leerGPSFresco();
  if (lecturaFresca) {
    return setUltimaPosicion(lecturaFresca) || lecturaFresca;
  }

  return null;
}

function normalizarPosicion(posicion) {
  const lat = Number(posicion?.lat ?? posicion?.latitude);
  const lng = Number(posicion?.lng ?? posicion?.longitude);
  const heading = Number.isFinite(Number(posicion?.heading)) ? Number(posicion.heading) : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, heading };
}

function leerGPSFresco() {
  if (!navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(normalizarPosicion({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading
      })),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 6500
      }
    );
  });
}
