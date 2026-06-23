const mongoose = require("mongoose");
const Viaje = require("../models/Viaje");
const Wallet = require("../models/Wallet");
const { redis } = require("../config/redis");
const { applyWalletDiscount } = require("./walletDiscount.service");

const ESTADO_NO_APLICA = "no_aplica";
const ESTADO_IDA = "ida";
const ESTADO_RETORNO_PENDIENTE = "retorno_pendiente";
const ESTADO_RETORNO_EN_CURSO = "retorno_en_curso";
const ESTADO_RETORNO_CANCELADO = "retorno_cancelado";
const ESTADO_COMPLETADO = "completado";

function wantsIdaVuelta(value, tipo = "viaje") {
  if (tipo === "envio") return false;

  if (value === true) return true;
  if (!value || typeof value !== "object") return false;

  return value.solicitada === true ||
    value.solicitado === true ||
    value.enabled === true ||
    value.activa === true ||
    value.roundTrip === true;
}

function calcularOpcionIdaVuelta({
  disponible = true,
  solicitada = false,
  precioBaseIda,
  distanciaIdaKm,
  duracionIdaMin,
  metodoPago,
  walletDiscountConfig
}) {
  if (!disponible) {
    return {
      disponible: false,
      solicitada: false,
      estado: ESTADO_NO_APLICA
    };
  }

  const baseIda = entero(precioBaseIda);
  const baseTotal = baseIda * 2;
  const idaDiscount = metodoPago === "wallet"
    ? applyWalletDiscount(baseIda, walletDiscountConfig)
    : applyWalletDiscount(baseIda, { enabled: false });
  const totalDiscount = metodoPago === "wallet"
    ? applyWalletDiscount(baseTotal, walletDiscountConfig)
    : applyWalletDiscount(baseTotal, { enabled: false });
  const precioIda = entero(idaDiscount.finalPrice);
  const precioTotal = entero(totalDiscount.finalPrice);
  const distanciaIda = numero(distanciaIdaKm);
  const duracionIda = entero(duracionIdaMin);

  return {
    disponible: true,
    solicitada: solicitada === true,
    estado: solicitada ? ESTADO_IDA : ESTADO_NO_APLICA,
    precioIda,
    precioVuelta: Math.max(0, precioTotal - precioIda),
    precioTotal,
    precioBaseIda: baseIda,
    precioBaseTotal: baseTotal,
    descuentoWalletIda: entero(idaDiscount.discountAmount),
    descuentoWalletTotal: entero(totalDiscount.discountAmount),
    descuentoWalletRate: numero(totalDiscount.rate),
    distanciaIdaKm: distanciaIda,
    distanciaTotalKm: Number((distanciaIda * 2).toFixed(2)),
    duracionIdaMin: duracionIda,
    duracionTotalMin: Math.max(1, duracionIda * 2)
  };
}

function aplicarIdaVueltaACotizacion({
  cotizacion,
  solicitarIdaVuelta,
  precioBaseIda,
  distanciaIdaKm,
  duracionIdaMin,
  metodoPago,
  walletDiscountConfig
}) {
  const opcion = calcularOpcionIdaVuelta({
    disponible: !!cotizacion.destino && cotizacion.tipo !== "envio",
    solicitada: solicitarIdaVuelta,
    precioBaseIda,
    distanciaIdaKm,
    duracionIdaMin,
    metodoPago,
    walletDiscountConfig
  });

  cotizacion.idaVuelta = opcion;

  if (!opcion.solicitada) return cotizacion;

  cotizacion.precio = opcion.precioTotal;
  cotizacion.precioBase = opcion.precioBaseTotal;
  cotizacion.descuentoWallet = opcion.descuentoWalletTotal;
  cotizacion.descuentoWalletRate = opcion.descuentoWalletRate;
  cotizacion.distanciaKm = opcion.distanciaTotalKm;
  cotizacion.duracionMin = opcion.duracionTotalMin;
  cotizacion.walletDiscount = metodoPago === "wallet" && opcion.descuentoWalletTotal > 0
    ? {
        enabled: true,
        basePrice: opcion.precioBaseTotal,
        finalPrice: opcion.precioTotal,
        discountAmount: opcion.descuentoWalletTotal,
        rate: opcion.descuentoWalletRate,
        percentage: Number((opcion.descuentoWalletRate * 100).toFixed(2)),
        label: "Remise Wallet"
      }
    : null;

  return cotizacion;
}

function prepararIdaVueltaPayload(viaje = {}) {
  const idaVuelta = viaje.idaVuelta || null;
  if (!idaVuelta) return null;

  const solicitada = idaVuelta.solicitada === true;
  const disponible = idaVuelta.disponible === true || solicitada;

  if (!disponible && !solicitada) {
    return {
      disponible: false,
      solicitada: false,
      estado: ESTADO_NO_APLICA
    };
  }

  return {
    disponible,
    solicitada,
    estado: idaVuelta.estado || (solicitada ? ESTADO_IDA : ESTADO_NO_APLICA),
    precioIda: entero(idaVuelta.precioIda),
    precioVuelta: entero(idaVuelta.precioVuelta),
    precioTotal: entero(idaVuelta.precioTotal || viaje.precio),
    precioBaseIda: entero(idaVuelta.precioBaseIda),
    precioBaseTotal: entero(idaVuelta.precioBaseTotal),
    descuentoWalletIda: entero(idaVuelta.descuentoWalletIda),
    descuentoWalletTotal: entero(idaVuelta.descuentoWalletTotal),
    descuentoWalletRate: numero(idaVuelta.descuentoWalletRate),
    distanciaIdaKm: numero(idaVuelta.distanciaIdaKm),
    distanciaTotalKm: numero(idaVuelta.distanciaTotalKm || viaje.distanciaKm),
    duracionIdaMin: entero(idaVuelta.duracionIdaMin),
    duracionTotalMin: entero(idaVuelta.duracionTotalMin || viaje.duracionMin),
    retornoPendienteAt: idaVuelta.retornoPendienteAt || null,
    retornoIniciadoAt: idaVuelta.retornoIniciadoAt || null,
    retornoCanceladoAt: idaVuelta.retornoCanceladoAt || null,
    retornoCompletadoAt: idaVuelta.retornoCompletadoAt || null,
    canceladoPor: idaVuelta.canceladoPor || null
  };
}

function debePausarParaRetorno(viaje = {}) {
  return viaje.tipo !== "envio" &&
    viaje.idaVuelta?.solicitada === true &&
    viaje.idaVuelta?.estado === ESTADO_IDA;
}

function estaRetornando(viaje = {}) {
  return viaje.idaVuelta?.solicitada === true &&
    viaje.idaVuelta?.estado === ESTADO_RETORNO_EN_CURSO;
}

function destinoOperacion(viaje = {}) {
  return estaRetornando(viaje) ? viaje.origen : viaje.destino;
}

async function marcarRetornoPendiente({ io, socket, viaje, motoristaId, session }) {
  viaje.idaVuelta.estado = ESTADO_RETORNO_PENDIENTE;
  viaje.idaVuelta.retornoPendienteAt = new Date();
  await viaje.save({ session });

  const payload = crearPayloadRetorno(viaje, motoristaId, "ida-vuelta:pendiente", {
    proximoDestino: viaje.origen,
    mensaje: "Llegaste al destino. Confirma si el pasajero hace la vuelta."
  });

  await guardarContextoRetorno(viaje, motoristaId, viaje.origen);

  io.to(`viaje:${viaje._id}`)
    .to(`motorista:${motoristaId}`)
    .to(`track:${viaje._id}`)
    .emit("ida-vuelta:pendiente", payload);

  socket?.emit?.("ida-vuelta:pendiente", payload);

  return payload;
}

async function iniciarRetorno({ io, socket, viajeId, motoristaId }) {
  const viaje = await Viaje.findOne({
    _id: viajeId,
    motorista: motoristaId,
    estado: "en_curso",
    "idaVuelta.solicitada": true,
    "idaVuelta.estado": ESTADO_RETORNO_PENDIENTE
  });

  if (!viaje) {
    return socket.emit("error-operacion", {
      code: "IDA_VUELTA_INVALIDA",
      msg: "La vuelta no esta pendiente para este viaje."
    });
  }

  viaje.idaVuelta.estado = ESTADO_RETORNO_EN_CURSO;
  viaje.idaVuelta.retornoIniciadoAt = new Date();
  await viaje.save();

  await guardarContextoRetorno(viaje, motoristaId, viaje.origen);

  const payload = crearPayloadRetorno(viaje, motoristaId, "ida-vuelta:retorno-iniciado", {
    proximoDestino: viaje.origen,
    mensaje: "Vuelta iniciada hacia el origen."
  });

  io.to(`viaje:${viajeId}`)
    .to(`motorista:${motoristaId}`)
    .to(`track:${viajeId}`)
    .emit("ida-vuelta:retorno-iniciado", payload);

  io.to(`pasajero:${viaje.pasajero}`).emit("viaje:iniciado", {
    ...payload,
    estado: "en_curso",
    timestamp: Date.now()
  });

  socket.emit("viaje:iniciado", {
    ...payload,
    estado: "en_curso",
    timestamp: Date.now()
  });

  return payload;
}

async function anularRetorno({ viajeId, motoristaId, canceladoPor = "pasajero" }) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const viaje = await Viaje.findOne({
      _id: viajeId,
      motorista: motoristaId,
      estado: "en_curso",
      "idaVuelta.solicitada": true,
      "idaVuelta.estado": ESTADO_RETORNO_PENDIENTE
    }).session(session);

    if (!viaje) {
      throw new Error("La vuelta no esta pendiente para anular.");
    }

    const precioAnterior = entero(viaje.precio);
    const precioIda = entero(viaje.idaVuelta.precioIda || viaje.precio);
    const diferencia = Math.max(0, precioAnterior - precioIda);

    if (viaje.metodoPago === "wallet" && diferencia > 0) {
      const wallet = await Wallet.findOne({ userId: viaje.pasajero }).session(session);
      if (wallet) {
        wallet.saldoBloqueado = Math.max(0, Number(wallet.saldoBloqueado || 0) - diferencia);
        wallet.saldo = Number(wallet.saldo || 0) + diferencia;
        wallet.movimientos.push({
          tipo: "ajuste_ida_vuelta",
          monto: diferencia,
          descripcion: "Vuelta anulada - diferencia liberada",
          ref: `VIAJE-${viaje._id}`,
          metadata: { precioAnterior, precioFinal: precioIda },
          fecha: new Date()
        });
        await wallet.save({ session });
      }
    }

    viaje.precio = precioIda;
    viaje.precioBase = entero(viaje.idaVuelta.precioBaseIda || viaje.precioBase || precioIda);
    viaje.descuentoWallet = entero(viaje.idaVuelta.descuentoWalletIda);
    viaje.distanciaKm = numero(viaje.idaVuelta.distanciaIdaKm || viaje.distanciaKm);
    viaje.duracionMin = entero(viaje.idaVuelta.duracionIdaMin || viaje.duracionMin);
    viaje.escrow = viaje.metodoPago === "wallet" ? precioIda : viaje.escrow;
    viaje.idaVuelta.estado = ESTADO_RETORNO_CANCELADO;
    viaje.idaVuelta.retornoCanceladoAt = new Date();
    viaje.idaVuelta.canceladoPor = canceladoPor;

    await viaje.save({ session });
    await session.commitTransaction();

    return prepararIdaVueltaPayload(viaje);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

async function marcarCompletado(viaje) {
  if (viaje.idaVuelta?.solicitada === true && viaje.idaVuelta.estado === ESTADO_RETORNO_EN_CURSO) {
    viaje.idaVuelta.estado = ESTADO_COMPLETADO;
    viaje.idaVuelta.retornoCompletadoAt = new Date();
  }
}

function crearPayloadRetorno(viaje, motoristaId, type, extra = {}) {
  return {
    type,
    viajeId: viaje._id.toString(),
    estado: viaje.estado,
    origen: viaje.origen || null,
    destino: viaje.destino || null,
    proximoDestino: extra.proximoDestino || null,
    precio: viaje.precio,
    precioBase: viaje.precioBase || viaje.precio,
    distanciaKm: viaje.distanciaKm,
    duracionMin: viaje.duracionMin,
    metodoPago: viaje.metodoPago,
    estadoPago: viaje.estadoPago,
    tipo: viaje.tipo || "viaje",
    idaVuelta: prepararIdaVueltaPayload(viaje),
    motoristaId,
    mensaje: extra.mensaje || ""
  };
}

async function guardarContextoRetorno(viaje, motoristaId, proximoDestino) {
  await redis.set(
    `viaje:ctx:${viaje._id}`,
    JSON.stringify({
      estado: viaje.estado,
      origen: viaje.origen || null,
      destino: viaje.destino || null,
      proximoDestino: proximoDestino || null,
      idaVuelta: prepararIdaVueltaPayload(viaje),
      motoristaId,
      pasajeroId: viaje.pasajero?.toString() || null
    }),
    "EX",
    600
  );
}

function entero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function numero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

module.exports = {
  ESTADO_NO_APLICA,
  ESTADO_IDA,
  ESTADO_RETORNO_PENDIENTE,
  ESTADO_RETORNO_EN_CURSO,
  ESTADO_RETORNO_CANCELADO,
  ESTADO_COMPLETADO,
  wantsIdaVuelta,
  calcularOpcionIdaVuelta,
  aplicarIdaVueltaACotizacion,
  prepararIdaVueltaPayload,
  debePausarParaRetorno,
  estaRetornando,
  destinoOperacion,
  marcarRetornoPendiente,
  iniciarRetorno,
  anularRetorno,
  marcarCompletado
};
