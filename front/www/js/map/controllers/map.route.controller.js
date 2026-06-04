import {
  dibujarRuta,
  dibujarRutaReserva,
  limpiarRutas
} from "../map.ruta.js?v=20260603-proximity-alert";

import {
  mismaPosicion,
  mismoTarget
} from "../utils/map.compare.js";

import {
  getRouteState,
  setRouteState,
  resetRouteState
} from "../state/map.route.state.js";

import {
  getMap,
  isMapReady
} from "../map.singleton.js";

/*************************************************
 * 🎯 ESTADOS VÁLIDOS
 *************************************************/
const ESTADOS_VALIDOS = [
  "asignado",
  "aceptado",
  "en_curso",
  "llego",
  "reservado",
  "finalizado",
  "cancelado"
];

/*************************************************
 * 🧠 CONTROLLER
 *************************************************/
export function processRouteFlow({
  estado,
  motorista,
  origen,
  destino,
  proximoDestino
}) {
  const payload = {
    estado,
    motorista,
    origen,
    destino,
    proximoDestino
  };

  if (!getMap() || !isMapReady()) {
    window.addEventListener(
      "map-ready",
      () => processRouteFlow(payload),
      { once: true }
    );
    return;
  }

  if (
    !motorista ||
    motorista.lat == null ||
    motorista.lng == null
  ) {
    return;
  }

  const estadoNorm =
    String(estado || "").toLowerCase();

  /*************************************************
   * 🚫 ESTADO INVÁLIDO
   *************************************************/
  if (
    !ESTADOS_VALIDOS.includes(
      estadoNorm
    )
  ) {

    console.warn(
      "⚠️ Estado inválido:",
      estadoNorm
    );

    return;
  }

  const {
    lastEstado,
    lastMotorista,
    lastTarget
  } = getRouteState();

  const posMotorista = {
    lat: motorista.lat,
    lng: motorista.lng
  };

  /*************************************************
   * 🎯 TARGET
   *************************************************/
  let targetActual = null;

  if (estadoNorm === "en_curso") {

    targetActual = destino;

  } else if (
    estadoNorm === "asignado" ||
    estadoNorm === "aceptado"
  ) {

    targetActual =
      proximoDestino || origen;
  } else if (estadoNorm === "reservado") {

    targetActual =
      proximoDestino || origen;
  }

  /*************************************************
   * 🔍 CAMBIOS
   *************************************************/
  const cambioEstado =
    estadoNorm !== lastEstado;

  const cambioMotorista =
    !mismaPosicion(
      posMotorista,
      lastMotorista
    );

  const cambioTarget =
    !mismoTarget(
      targetActual,
      lastTarget
    );

  /*************************************************
   * 🚫 SIN CAMBIOS
   *************************************************/
  if (
    !cambioEstado &&
    !cambioMotorista &&
    !cambioTarget
  ) {
    return;
  }

  /*************************************************
   * 🧹 CAMBIO DE FASE
   *************************************************/
  if (cambioEstado) {

    console.log(
      `🧠 Fase: ${estadoNorm}`
    );

    limpiarRutas(false);
  }

  /*************************************************
   * 🧭 FLOW
   *************************************************/
  switch (estadoNorm) {

    case "asignado":
    case "aceptado": {

      const destinoReal =
        proximoDestino || origen;

      if (destinoReal) {

        dibujarRuta(
          posMotorista,
          destinoReal,
          cambioEstado
        );

      } else {

        console.warn(
          "⚠️ Sin destino asignado"
        );
      }

      break;
    }

    case "en_curso": {

      if (destino) {

        dibujarRuta(
          posMotorista,
          destino,
          cambioEstado
        );

      } else {

        console.warn(
          "⚠️ Sin destino viaje"
        );
      }

      break;
    }

    case "llego":

      limpiarRutas(false);

      break;

    case "reservado": {

      if (
        proximoDestino &&
        origen
      ) {

        dibujarRutaReserva(
          posMotorista,
          proximoDestino,
          origen,
          null,
          cambioEstado
        );

      } else if (origen) {

        dibujarRuta(
          posMotorista,
          origen,
          cambioEstado
        );

      } else {

        console.warn(
          "⚠️ Datos reserva incompletos"
        );
      }

      break;
    }

    case "finalizado":
    case "cancelado":

      limpiarRutas(true);

      resetRouteState();

      return;
  }

  /*************************************************
   * 💾 CACHE
   *************************************************/
  setRouteState({
    estado: estadoNorm,
    motorista: posMotorista,
    target: targetActual
  });
}
