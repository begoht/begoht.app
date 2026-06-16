import { resetRutaCache } from "../map.ruta.js?v=20260615-smooth-autofinish";

let lastEstado = null;

let lastMotorista = null;

let lastTarget = null;

/*************************************************
 * 💾 GET STATE
 *************************************************/
export function getRouteState() {

  return {
    lastEstado,
    lastMotorista,
    lastTarget
  };
}

/*************************************************
 * 💾 UPDATE STATE
 *************************************************/
export function setRouteState({
  estado,
  motorista,
  target
}) {

  lastEstado = estado;

  lastMotorista = motorista;

  lastTarget = target;
}

/*************************************************
 * 🔄 RESET
 *************************************************/
export function resetRouteState() {

  lastEstado = null;

  lastMotorista = null;

  lastTarget = null;

  resetRutaCache();
}
