const mongoose = require("mongoose");
const Viaje = require("../models/Viaje");
const Wallet = require("../models/Wallet");
const { redis } = require("../config/redis");
const { activarSiguienteViaje } = require("./activarSiguienteViaje");
const { actualizarSnapshotMotorista } = require("../sockets/viajes/motorista/motoristaSnapshot.service");
const { calcularDistanciaMetros } = require("../utils/geo");
const { PLATFORM_ALIAS } = require("../config/constants");
const { ensurePlatformAccount } = require("./platformAccount.service");
const { enviarResumenViaje } = require("./email/email.service");
const { getCommissionRate, calculateCommission } = require("./commission.service");
const { normalizeLegacyWalletDebt } = require("./driverCommission.service");
const {
  FINISH_MAX_DISTANCE_METERS,
  validarCercaniaMotorista
} = require("./tripProximity.service");
const crypto = require("crypto");

const LOCK_TTL = 30000;

async function acquireLock(viajeId) {
  const lockId = crypto.randomUUID();
  const ok = await redis.set(`lock:finish:${viajeId}`, lockId, "NX", "PX", LOCK_TTL);
  return ok ? lockId : null;
}

async function releaseLock(viajeId, lockId) {
  const script = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
  await redis.eval(script, 1, `lock:finish:${viajeId}`, lockId);
}

async function obtenerUltimaPosicionMotorista(motoristaId) {
  const raw = await redis.get(`motorista:pos:${motoristaId}`);

  if (raw) {
    try {
      const pos = JSON.parse(raw);
      const lat = Number(pos.lat);
      const lng = Number(pos.lng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    } catch {}
  }

  const data = await redis.hgetall(`motorista:data:${motoristaId}`);
  const lat = Number(data?.lat);
  const lng = Number(data?.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return null;
}

async function obtenerTrayectoriaReal(viajeId) {
  const rows = await redis.lrange(`viaje:trayectoria:${viajeId}`, 0, -1);
  const puntos = [];

  for (const raw of rows) {
    try {
      const point = JSON.parse(raw);
      const lat = Number(point.lat);
      const lng = Number(point.lng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        puntos.push({
          lat,
          lng,
          timestamp: point.timestamp ? new Date(point.timestamp) : new Date()
        });
      }
    } catch {}
  }

  return puntos;
}

function calcularDistanciaTrayectoria(puntos = []) {
  if (!Array.isArray(puntos) || puntos.length < 2) return 0;

  let total = 0;

  for (let i = 1; i < puntos.length; i += 1) {
    const anterior = puntos[i - 1];
    const actual = puntos[i];
    const tramo = calcularDistanciaMetros(anterior.lat, anterior.lng, actual.lat, actual.lng);

    if (Number.isFinite(tramo)) {
      total += tramo;
    }
  }

  return Math.round(total);
}

function crearPuntoTrayectoria(ubicacion, timestamp = new Date()) {
  const lat = Number(ubicacion?.lat);
  const lng = Number(ubicacion?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, timestamp };
}

function pushPuntoSiEsNuevo(puntos, punto, distanciaMinimaMetros = 3) {
  if (!punto) return;

  const anterior = puntos[puntos.length - 1];
  if (!anterior) {
    puntos.push(punto);
    return;
  }

  const distancia = calcularDistanciaMetros(anterior.lat, anterior.lng, punto.lat, punto.lng);
  if (!Number.isFinite(distancia) || distancia >= distanciaMinimaMetros) {
    puntos.push(punto);
  }
}

function construirTrayectoriaFinal({ viaje, trayectoriaReal, ultimaPosicion }) {
  const puntos = Array.isArray(trayectoriaReal) ? [...trayectoriaReal] : [];

  if (!puntos.length) {
    pushPuntoSiEsNuevo(
      puntos,
      crearPuntoTrayectoria(viaje.origen, viaje.inicioViajeAt || viaje.createdAt || new Date()),
      0
    );
  }

  pushPuntoSiEsNuevo(
    puntos,
    crearPuntoTrayectoria(ultimaPosicion, new Date())
  );

  let distanciaCalculada = calcularDistanciaTrayectoria(puntos);

  if (distanciaCalculada <= 0) {
    pushPuntoSiEsNuevo(
      puntos,
      crearPuntoTrayectoria(viaje.destino, new Date()),
      0
    );
    distanciaCalculada = calcularDistanciaTrayectoria(puntos);
  }

  const distanciaCotizadaMetros = Math.round(Number(viaje.distanciaKm || 0) * 1000);
  const distanciaFinal = distanciaCalculada > 0
    ? distanciaCalculada
    : (Number.isFinite(distanciaCotizadaMetros) ? distanciaCotizadaMetros : 0);

  return {
    puntos,
    distanciaMetros: distanciaFinal
  };
}

async function liquidarWallet({ viaje, motoristaId, neto, comision, session }) {
  const { wallet: walletPlataforma } = await ensurePlatformAccount(session);
  const esEfectivo = viaje.metodoPago === "efectivo";

  if (!esEfectivo) {
    const pasajeroId = viaje.pasajero._id || viaje.pasajero;
    const walletMotorista = await Wallet.findOneAndUpdate(
      { userId: motoristaId },
      {
        $setOnInsert: {
          userId: motoristaId,
          saldo: 0,
          saldoBloqueado: 0,
          gananciaEfectivo: 0,
          comisionPendiente: 0
        }
      },
      { upsert: true, new: true, session }
    );

    const total = Number(viaje.escrow || viaje.precio || 0);
    let walletPasajero = null;

    if (viaje.metodoPago === "wallet") {
      walletPasajero = await Wallet.findOne({ userId: pasajeroId }).session(session);

      if (!walletPasajero) {
        throw new Error("Wallet del pasajero no encontrada");
      }

      const bloqueado = Number(walletPasajero.saldoBloqueado || 0);

      if (bloqueado >= total) {
        walletPasajero.capturar(total, `VIAJE-${viaje._id}`);
      } else if (bloqueado <= 0 && ["en_escrow", "saldoBloqueado"].includes(viaje.estadoPago) && total > 0) {
        walletPasajero.movimientos.push({
          tipo: "pago_final",
          monto: -total,
          descripcion: "Pago final viaje",
          ref: `VIAJE-${viaje._id}`,
          metadata: { legacyEscrow: true },
          fecha: new Date()
        });
      } else {
        throw new Error("Escrow insuficiente");
      }
    }

    await normalizeLegacyWalletDebt(walletMotorista, { session });
    walletMotorista.recargar(neto, "pago_viaje", `VIAJE-${viaje._id}`);
    walletPlataforma.recargar(comision, "comision_viaje", `VIAJE-${viaje._id}`);

    if (walletPasajero) {
      await walletPasajero.save({ session });
    }
    await walletMotorista.save({ session });
    await walletPlataforma.save({ session });
    return;
  }

  const walletMotorista = await Wallet.findOneAndUpdate(
    { userId: motoristaId },
    {
      $setOnInsert: {
        userId: motoristaId,
        saldo: 0,
        saldoBloqueado: 0,
        gananciaEfectivo: 0,
        comisionPendiente: 0
      }
    },
    { upsert: true, new: true, session }
  );

  await normalizeLegacyWalletDebt(walletMotorista, { session });
  walletMotorista.registrarViajeEfectivo({
    ganancia: neto,
    comision,
    ref: `VIAJE-${viaje._id}`
  });

  walletPlataforma.movimientos.push({
    tipo: "comision_pendiente_efectivo",
    monto: 0,
    descripcion: "Comision en efectivo pendiente de transferencia",
    ref: `VIAJE-${viaje._id}`,
    metadata: { motoristaId, montoPendiente: comision, aliasPago: PLATFORM_ALIAS },
    fecha: new Date()
  });

  await walletMotorista.save({ session });
  await walletPlataforma.save({ session });
}

async function liberarMotorista(motoristaId) {
  const ultimaPosicion = await obtenerUltimaPosicionMotorista(motoristaId);

  await redis.multi()
    .hset(`motorista:data:${motoristaId}`, {
      disponible: "true",
      estadoInterno: "libre",
      viajeActualId: "",
      tieneReserva: "false",
      viajeReservadoId: "",
      lastUpdate: Date.now().toString()
    })
    .srem("motoristas:ocupados", motoristaId)
    .sadd("motoristas:disponibles", motoristaId)
    .del(`lock:motorista:${motoristaId}`, `lock:cola:${motoristaId}`, `motorista:snapshot:${motoristaId}`)
    .exec();

  if (!ultimaPosicion) {
    console.warn(`Motorista ${motoristaId} disponible, pero sin ultima posicion para GEO`);
    return;
  }

  const { lat, lng } = ultimaPosicion;
  await redis.hset(`motorista:data:${motoristaId}`, {
    lat: String(lat),
    lng: String(lng),
    lastUpdate: Date.now().toString()
  });
  await redis.call("GEOADD", "motoristas:ubicacion", lng, lat, motoristaId);
}

function crearPayloadFinalizado({ viaje, viajeId, neto }) {
  const esEnvio = (viaje.tipo || "viaje") === "envio";

  return {
    viajeId,
    total: viaje.precio,
    neto,
    distanciaRealMetros: viaje.distanciaRealMetros,
    viaje: {
      _id: viaje._id,
      estado: "finalizado",
      estadoPago: "pagado",
      origen: viaje.origen,
      destino: viaje.destino,
      precio: viaje.precio,
      distanciaKm: viaje.distanciaKm,
      distanciaRealMetros: viaje.distanciaRealMetros,
      pagoMotorista: neto,
      paBeGOrista: neto,
      metodoPago: viaje.metodoPago,
      tipo: viaje.tipo || "viaje",
      paquete: esEnvio && viaje.paquete ? {
        pesoKg: viaje.paquete.pesoKg,
        descripcion: viaje.paquete.descripcion || "",
        instrucciones: viaje.paquete.instrucciones || "",
        codigoEntregaConfirmadoAt: viaje.paquete.codigoEntregaConfirmadoAt || null
      } : null,
      finViajeAt: viaje.finViajeAt,
      createdAt: viaje.createdAt
    }
  };
}

function normalizarCodigoEntrega(codigoEntrega) {
  return String(codigoEntrega || "").replace(/\D/g, "").slice(0, 4);
}

function validarCodigoEntrega(viaje, codigoEntrega) {
  if ((viaje.tipo || "viaje") !== "envio") return;

  const codigo = normalizarCodigoEntrega(codigoEntrega);
  const codigoEsperado = String(viaje.paquete?.codigoEntrega || "");

  if (codigo.length !== 4 || codigo !== codigoEsperado) {
    const err = new Error("Codigo de entrega incorrecto. Pide al pasajero el codigo de 4 digitos.");
    err.code = "CODIGO_ENTREGA_INVALIDO";
    throw err;
  }

  viaje.paquete.codigoEntregaConfirmadoAt = new Date();
}

function nombreCompleto(user) {
  return `${user?.nombre || ""} ${user?.apellido || ""}`.trim();
}

function direccionTexto(ubicacion) {
  if (!ubicacion) return "";
  return ubicacion.direccion || ubicacion.address || `${ubicacion.lat || ""}, ${ubicacion.lng || ""}`.trim();
}

function minutosViaje(viaje) {
  const inicio = viaje.inicioViajeAt ? new Date(viaje.inicioViajeAt).getTime() : null;
  const fin = viaje.finViajeAt ? new Date(viaje.finViajeAt).getTime() : Date.now();
  if (inicio && Number.isFinite(inicio) && Number.isFinite(fin) && fin > inicio) {
    return Math.max(1, Math.round((fin - inicio) / 60000));
  }
  return Math.max(0, Math.round(Number(viaje.duracionMin || 0)));
}

function enviarReciboFinalizacion(viaje, viajeId, total) {
  const email = viaje.pasajero?.email;
  if (!email) return;

  enviarResumenViaje({
    email,
    nombrePasajero: nombreCompleto(viaje.pasajero) || "Pasajero",
    viajeId,
    pasajeroId: viaje.pasajero?._id,
    distanciaKm: Number(viaje.distanciaRealMetros || 0) > 0
      ? (Number(viaje.distanciaRealMetros) / 1000).toFixed(2)
      : Number(viaje.distanciaKm || 0).toFixed(2),
    tiempo: minutosViaje(viaje),
    total: viaje.precio || total,
    origen: direccionTexto(viaje.origen),
    destino: direccionTexto(viaje.destino),
    nombreConductor: nombreCompleto(viaje.motorista) || "Socio BeGO",
    metodoPago: viaje.metodoPago
  }).catch((error) => {
    console.error("No se pudo enviar recibo por email:", error.message);
  });
}

module.exports = async function finalizarViaje({
  io,
  socket,
  viajeId,
  motoristaId,
  codigoEntrega,
  lat,
  lng,
  enforceProximity = true,
  enforceDeliveryCode = true,
  source = "motorista",
  motivo = "",
  adminId = null,
  emitErrors = true,
  throwOnError = false
}) {
  const lockId = await acquireLock(viajeId);
  if (!lockId) {
    const lockError = new Error("Finalizacion en proceso. Intenta nuevamente en unos segundos.");
    lockError.code = "FINALIZACION_EN_PROCESO";
    if (throwOnError) throw lockError;
    return { ok: false, error: lockError.message, code: lockError.code };
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const viaje = await Viaje.findOne({
      _id: viajeId,
      motorista: motoristaId
    })
      .populate("pasajero", "nombre apellido email telefono")
      .populate("motorista", "nombre apellido telefono")
      .session(session);

    if (!viaje || viaje.finalizacionProcesada || viaje.estado !== "en_curso") {
      throw new Error("El viaje ya fue procesado o no es valido para finalizar");
    }

    if (enforceProximity) {
      await validarCercaniaMotorista({
        motoristaId,
        target: viaje.destino,
        fallbackPosition: { lat, lng },
        maxDistanceMeters: FINISH_MAX_DISTANCE_METERS,
        code: "DISTANCIA_DESTINO",
        message: "Estas lejos del destino. Acercate para finalizar el viaje."
      });
    }

    if (enforceDeliveryCode) {
      validarCodigoEntrega(viaje, codigoEntrega);
    }

    const trayectoriaRedis = await obtenerTrayectoriaReal(viajeId);
    const ultimaPosicion = await obtenerUltimaPosicionMotorista(motoristaId);
    const trayectoriaFinal = construirTrayectoriaFinal({
      viaje,
      trayectoriaReal: trayectoriaRedis,
      ultimaPosicion
    });
    const total = Number(viaje.escrow || viaje.precio || 0);
    const commissionRate = await getCommissionRate({ session });
    const comision = calculateCommission(total, commissionRate);
    const neto = total - comision;

    await liquidarWallet({ viaje, motoristaId, neto, comision, session });

    viaje.estado = "finalizado";
    viaje.estadoPago = "pagado";
    viaje.finViajeAt = new Date();
    viaje.distanciaRealMetros = trayectoriaFinal.distanciaMetros;
    if (trayectoriaFinal.puntos.length) {
      viaje.trayectoriaReal = trayectoriaFinal.puntos;
    }
    viaje.finalizacionProcesada = true;
    viaje.finalizadoPor = normalizeFinishSource(source);
    viaje.finalizacionMotivo = String(motivo || defaultFinishReason(source)).slice(0, 160);
    viaje.finalizadoPorAdmin = adminId || null;
    viaje.finalizadoAutomaticamente = normalizeFinishSource(source) === "auto";
    viaje.comision = comision;
    viaje.pagoMotorista = neto;
    viaje.paBeGOrista = neto;
    viaje.escrow = 0;

    const siguienteViaje = await Viaje.findOne({
      motorista: motoristaId,
      estado: "reservado"
    }).sort({ createdAt: 1 }).session(session);
    const tieneSiguiente = !!siguienteViaje;

    await viaje.save({ session });
    await session.commitTransaction();

    await Promise.all([
      global.emitWalletUpdate?.(motoristaId),
      global.emitWalletUpdate?.(viaje.pasajero._id.toString())
    ]);

    await redis.set(
      `viaje:ctx:${viajeId}`,
      JSON.stringify({
        estado: "finalizado",
        origen: viaje.origen,
        destino: viaje.destino,
        proximoDestino: null,
        motoristaId
      }),
      "EX",
      60
    );

    if (tieneSiguiente) {
      await redis.hset(`motorista:data:${motoristaId}`, {
        viajeActualId: "",
        estadoInterno: "transicion_b2b",
        disponible: "false"
      });

      await actualizarSnapshotMotorista(motoristaId, {
        viajeActualId: "",
        viajeReservadoId: siguienteViaje._id.toString(),
        estadoInterno: "transicion_b2b",
        estadoViaje: "reservado"
      });
      await redis.del(`lock:cola:${motoristaId}`);
    } else {
      await liberarMotorista(motoristaId);
    }

    const finalizadoPayload = crearPayloadFinalizado({ viaje, viajeId, neto });

    io
      .to(`viaje:${viajeId}`)
      .to(`motorista:${motoristaId}`)
      .to(`track:${viajeId}`)
      .emit("viaje-finalizado", finalizadoPayload);
    io.to(`track:${viajeId}`).emit("track:cerrado", finalizadoPayload);
    io.to(`motorista:${motoristaId}`).emit("driver:actividad-actualizada", finalizadoPayload);
    enviarReciboFinalizacion(viaje, viajeId, total);

    if (tieneSiguiente) {
      await activarSiguienteViaje(io, socket, motoristaId);
    }

    await redis.del(`viaje:trayectoria:${viajeId}`, `trayectoria:cooldown:${viajeId}`);
    return {
      ok: true,
      viajeId,
      estado: "finalizado",
      finalizadoPor: viaje.finalizadoPor,
      finalizacionMotivo: viaje.finalizacionMotivo
    };
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("ERROR CRITICO finalizarViaje:", err.message);
    if (emitErrors && socket?.emit) {
      socket.emit("error-finalizar", {
        code: err.code,
        msg: err.message,
        viajeId,
        distanciaMetros: err.distanciaMetros,
        maxDistanceMeters: err.maxDistanceMeters
      });
    }

    if (throwOnError) {
      throw err;
    }

    return {
      ok: false,
      error: err.message,
      code: err.code,
      viajeId
    };
  } finally {
    await session.endSession();
    await releaseLock(viajeId, lockId);
  }
};

function normalizeFinishSource(source) {
  if (source === "admin") return "admin";
  if (source === "auto" || source === "auto_timeout") return "auto";
  return "motorista";
}

function defaultFinishReason(source) {
  const normalized = normalizeFinishSource(source);
  if (normalized === "admin") return "finalizado_por_admin";
  if (normalized === "auto") return "auto_una_hora_sin_finalizar";
  return "finalizado_por_motorista";
}
