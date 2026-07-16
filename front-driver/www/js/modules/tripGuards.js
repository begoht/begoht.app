import { getUltimaPosicion, refreshDriverLocation } from "./gps.js?v=20260716-live-trip-tracking";
import {
  ARRIVAL_MAX_DISTANCE_METERS,
  FINISH_MAX_DISTANCE_METERS,
  calcularDistanciaMetros,
  formatearDistancia,
  normalizarPunto
} from "../utils/distance.js?v=20260613-trip-guards";

export { ARRIVAL_MAX_DISTANCE_METERS, FINISH_MAX_DISTANCE_METERS, normalizarPunto };

export async function validarCercaniaViaje({
  viaje,
  targetKey,
  maxDistanceMeters,
  farMessage,
  missingTargetMessage = "Impossible de verifier la destination.",
  missingGpsMessage = "Active le GPS pour continuer."
}) {
  const target = normalizarPunto(viaje?.[targetKey]);

  if (!target) {
    notificarGuardia(missingTargetMessage, "#ef4444");
    return { ok: false, reason: "missing_target" };
  }

  const posicion = await obtenerPosicionConRefresh();

  if (!posicion) {
    notificarGuardia(missingGpsMessage, "#ef4444");
    return { ok: false, reason: "missing_gps" };
  }

  const distanciaMetros = calcularDistanciaMetros(posicion, target);

  if (!Number.isFinite(distanciaMetros)) {
    notificarGuardia("Impossible de verifier la distance. Reessayez.", "#ef4444");
    return { ok: false, reason: "invalid_distance", posicion, target };
  }

  if (distanciaMetros > maxDistanceMeters) {
    const distancia = formatearDistancia(distanciaMetros);
    const limite = formatearDistancia(maxDistanceMeters);
    notificarGuardia(farMessage(distancia, limite), "#f59e0b");
    return {
      ok: false,
      reason: "too_far",
      posicion,
      target,
      distanciaMetros,
      maxDistanceMeters
    };
  }

  return {
    ok: true,
    posicion,
    target,
    distanciaMetros,
    maxDistanceMeters
  };
}

export function notificarGuardia(text, color = "#111827") {
  if (typeof Toastify === "function") {
    Toastify({
      text,
      duration: 4200,
      gravity: "top",
      position: "center",
      style: {
        background: color,
        color: "#fff",
        fontWeight: "900"
      }
    }).showToast();
    return;
  }

  alert(text);
}

async function obtenerPosicionConRefresh() {
  const cached = normalizarPunto(getUltimaPosicion());

  await refreshDriverLocation({ force: true });
  return normalizarPunto(getUltimaPosicion()) || cached;
}
