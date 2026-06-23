export const IDA_VUELTA_ESTADOS = {
  NO_APLICA: "no_aplica",
  IDA: "ida",
  RETORNO_PENDIENTE: "retorno_pendiente",
  RETORNO_EN_CURSO: "retorno_en_curso",
  RETORNO_CANCELADO: "retorno_cancelado",
  COMPLETADO: "completado"
};

export function normalizarIdaVuelta(value = null) {
  if (!value || typeof value !== "object") return null;

  const solicitada = value.solicitada === true;
  const disponible = value.disponible === true || solicitada;

  return {
    ...value,
    disponible,
    solicitada,
    estado: value.estado || (solicitada ? IDA_VUELTA_ESTADOS.IDA : IDA_VUELTA_ESTADOS.NO_APLICA),
    precioIda: entero(value.precioIda),
    precioVuelta: entero(value.precioVuelta),
    precioTotal: entero(value.precioTotal),
    precioBaseIda: entero(value.precioBaseIda),
    precioBaseTotal: entero(value.precioBaseTotal),
    descuentoWalletIda: entero(value.descuentoWalletIda),
    descuentoWalletTotal: entero(value.descuentoWalletTotal),
    descuentoWalletRate: numero(value.descuentoWalletRate),
    distanciaIdaKm: numero(value.distanciaIdaKm),
    distanciaTotalKm: numero(value.distanciaTotalKm),
    duracionIdaMin: entero(value.duracionIdaMin),
    duracionTotalMin: entero(value.duracionTotalMin)
  };
}

export function idaVueltaDisponible(value, tipo = "viaje") {
  const idaVuelta = normalizarIdaVuelta(value);
  return tipo !== "envio" && idaVuelta?.disponible === true && idaVuelta.precioTotal > 0;
}

export function aplicarSeleccionIdaVuelta(value, seleccionada) {
  const idaVuelta = normalizarIdaVuelta(value);
  if (!idaVuelta) return null;

  const solicitada = seleccionada === true;
  return {
    ...idaVuelta,
    solicitada,
    estado: solicitada ? IDA_VUELTA_ESTADOS.IDA : IDA_VUELTA_ESTADOS.NO_APLICA
  };
}

export function precioSegunSeleccion(value, seleccionada, fallback = 0) {
  const idaVuelta = normalizarIdaVuelta(value);
  if (!idaVuelta || !seleccionada) return entero(fallback);
  return idaVuelta.precioTotal || entero(fallback);
}

export function distanciaSegunSeleccion(value, seleccionada, fallback = 0) {
  const idaVuelta = normalizarIdaVuelta(value);
  if (!idaVuelta || !seleccionada) return numero(fallback);
  return idaVuelta.distanciaTotalKm || numero(fallback);
}

export function estaRetornoPendiente(value) {
  return normalizarIdaVuelta(value)?.estado === IDA_VUELTA_ESTADOS.RETORNO_PENDIENTE;
}

export function estaRetornando(value) {
  return normalizarIdaVuelta(value)?.estado === IDA_VUELTA_ESTADOS.RETORNO_EN_CURSO;
}

export function esIdaVueltaActiva(value) {
  const estado = normalizarIdaVuelta(value)?.estado;
  return estado === IDA_VUELTA_ESTADOS.IDA ||
    estado === IDA_VUELTA_ESTADOS.RETORNO_PENDIENTE ||
    estado === IDA_VUELTA_ESTADOS.RETORNO_EN_CURSO;
}

export function destinoOperacion({ estado, destino, proximoDestino, idaVuelta }) {
  if (String(estado || "").toLowerCase() === "en_curso" && estaRetornando(idaVuelta)) {
    return proximoDestino || null;
  }

  if (String(estado || "").toLowerCase() === "en_curso") {
    return proximoDestino || destino || null;
  }

  return proximoDestino || destino || null;
}

function entero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function numero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}
