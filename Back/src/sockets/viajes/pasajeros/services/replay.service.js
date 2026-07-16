const viajeRepo = require("../repositories/viaje.repository");
const formatMotorista = require("../../../../utils/formatMotorista");
const { redis } = require("../../../../config/redis");
const { prepararIdaVueltaPayload } = require("../../../../services/idaVuelta.service");

const ESTADOS_BUSQUEDA = ["buscando", "ofertando"];
const ESTADOS_ACTIVOS = ["reservado", "asignado", "llego", "en_curso"];

module.exports = async function replayViaje(socket, options = {}) {
  const now = Date.now();
  const recoveryViajeId = normalizarObjectId(options?.viajeId);

  if (socket.data?.replayInFlight) {
    if (recoveryViajeId) socket.data.pendingRecoveryViajeId = recoveryViajeId;
    return;
  }

  if (!recoveryViajeId && now - (socket.data?.lastReplayAt || 0) < 1000) {
    return;
  }

  socket.data = socket.data || {};
  socket.data.replayInFlight = true;
  socket.data.lastReplayAt = now;

  try {
    const pasajeroId = (socket.user.id || socket.user._id).toString();
    const viaje = await viajeRepo.findReplay(pasajeroId);

    if (!viaje) {
      const finalizado = recoveryViajeId
        ? await viajeRepo.findFinalizadoParaPasajero(pasajeroId, recoveryViajeId)
        : null;

      if (finalizado) {
        socket.emit("viaje-finalizado", prepararFinalizado(finalizado, true));
        return;
      }

      return socket.emit("viaje-sync", { activo: false });
    }

    const viajeId = viaje._id.toString();
    socket.join(`viaje:${viajeId}`);
    socket.join(`track:${viajeId}`);
    socket.join(`user:${pasajeroId}`);

    if (ESTADOS_BUSQUEDA.includes(viaje.estado)) {
      socket.emit("precio-calculado", {
        viajeId,
        precio: viaje.precio,
        precioBase: viaje.precioBase || viaje.precio,
        descuentoWallet: viaje.descuentoWallet || 0,
        descuentoWalletRate: viaje.descuentoWalletRate || 0,
        walletDiscount: prepararWalletDiscount(viaje),
        distanciaKm: viaje.distanciaKm,
        metodoPago: viaje.metodoPago,
        tipo: viaje.tipo || "viaje",
        paquete: prepararPaquetePasajero(viaje),
        idaVuelta: prepararIdaVueltaPayload(viaje),
        origen: viaje.origen?.direccion,
        destino: viaje.destino?.direccion,
        estado: "buscando",
        rutaGeometria: viaje.rutaGeometria || null
      });

      socket.emit("viaje-buscando", {
        viajeId,
        tipo: viaje.tipo || "viaje",
        paquete: prepararPaquetePasajero(viaje),
        idaVuelta: prepararIdaVueltaPayload(viaje),
        mensaje: "Buscando al motorista mas cercano..."
      });

      return console.log(`Replay: viaje ${viajeId} en busqueda para ${pasajeroId}`);
    }

    if (!ESTADOS_ACTIVOS.includes(viaje.estado)) {
      return socket.emit("viaje-sync", { activo: false });
    }

    const motoristaId = viaje.motorista?._id?.toString();
    const posicion = motoristaId ? await obtenerUltimaPosicion(motoristaId) : null;
    const motorista = prepararMotorista(viaje.motorista, posicion);
    const proximoDestino = await obtenerProximoDestino(viajeId, viaje);

    await guardarContexto(viajeId, viaje, motoristaId, proximoDestino);

    const basePayload = {
      viajeId,
      estado: viaje.estado,
      motorista,
      origen: viaje.origen,
      destino: viaje.destino,
      proximoDestino,
      precio: viaje.precio,
      precioBase: viaje.precioBase || viaje.precio,
      descuentoWallet: viaje.descuentoWallet || 0,
      descuentoWalletRate: viaje.descuentoWalletRate || 0,
      walletDiscount: prepararWalletDiscount(viaje),
      distanciaKm: viaje.distanciaKm,
      duracionMin: viaje.duracionMin,
      metodoPago: viaje.metodoPago,
      estadoPago: viaje.estadoPago,
      tipo: viaje.tipo || "viaje",
      paquete: prepararPaquetePasajero(viaje),
      idaVuelta: prepararIdaVueltaPayload(viaje),
      rutaGeometria: viaje.rutaGeometria || null,
      isReplay: true
    };

    socket.emit("viaje-asignado", basePayload);

    if (viaje.estado === "llego") {
      socket.emit("viaje:motorista-llego", { viajeId });
    }

    if (viaje.estado === "en_curso") {
      socket.emit("viaje:iniciado", {
        viajeId,
        estado: "en_curso",
        origen: viaje.origen,
        destino: viaje.destino,
        proximoDestino,
        tipo: viaje.tipo || "viaje",
        paquete: prepararPaquetePasajero(viaje),
        idaVuelta: prepararIdaVueltaPayload(viaje),
        timestamp: Date.now(),
        isReplay: true
      });
    }

    if (posicion) {
      socket.emit("track:posicion", {
        viajeId,
        lat: posicion.lat,
        lng: posicion.lng,
        heading: posicion.heading,
        origen: viaje.origen,
        destino: viaje.destino,
        proximoDestino,
        idaVuelta: prepararIdaVueltaPayload(viaje),
        estado: viaje.estado,
        isReplay: true,
        timestamp: Date.now(),
        rutaGeometria: viaje.rutaGeometria || null
      });
    }

    socket.emit("viaje-sync", {
      activo: true,
      viajeId,
      estado: viaje.estado,
      motorista,
      origen: viaje.origen,
      destino: viaje.destino,
      proximoDestino,
      precio: viaje.precio,
      precioBase: viaje.precioBase || viaje.precio,
      descuentoWallet: viaje.descuentoWallet || 0,
      descuentoWalletRate: viaje.descuentoWalletRate || 0,
      walletDiscount: prepararWalletDiscount(viaje),
      distanciaKm: viaje.distanciaKm,
      duracionMin: viaje.duracionMin,
      metodoPago: viaje.metodoPago,
      estadoPago: viaje.estadoPago,
      tipo: viaje.tipo || "viaje",
      paquete: prepararPaquetePasajero(viaje),
      idaVuelta: prepararIdaVueltaPayload(viaje)
    });

    console.log(`Replay: estado ${viaje.estado} recuperado para ${pasajeroId}`);
  } catch (error) {
    console.error("Error en replayViaje:", error);
    socket.emit("viaje-sync", { activo: false });
  } finally {
    socket.data.replayInFlight = false;
    const pendingRecoveryViajeId = socket.data.pendingRecoveryViajeId;
    socket.data.pendingRecoveryViajeId = null;
    if (pendingRecoveryViajeId) {
      setImmediate(() => module.exports(socket, { viajeId: pendingRecoveryViajeId }));
    }
  }
};

function normalizarObjectId(value) {
  const id = String(value || "").trim();
  return /^[a-f\d]{24}$/i.test(id) ? id : null;
}

function prepararFinalizado(viaje, isReplay = false) {
  const viajeId = viaje._id.toString();
  const motorista = prepararMotorista(viaje.motorista, null);

  return {
    viajeId,
    total: Number(viaje.precio || 0),
    neto: Number(viaje.pagoMotorista || viaje.paBeGOrista || 0),
    distanciaRealMetros: Number(viaje.distanciaRealMetros || 0),
    isReplay,
    viaje: {
      _id: viajeId,
      estado: "finalizado",
      estadoPago: viaje.estadoPago || "pagado",
      origen: viaje.origen,
      destino: viaje.destino,
      precio: Number(viaje.precio || 0),
      precioBase: Number(viaje.precioBase || viaje.precio || 0),
      descuentoWallet: Number(viaje.descuentoWallet || 0),
      descuentoWalletRate: Number(viaje.descuentoWalletRate || 0),
      distanciaKm: Number(viaje.distanciaKm || 0),
      distanciaRealMetros: Number(viaje.distanciaRealMetros || 0),
      duracionMin: Number(viaje.duracionMin || 0),
      metodoPago: viaje.metodoPago,
      tipo: viaje.tipo || "viaje",
      ciudad: viaje.ciudad || "",
      idaVuelta: prepararIdaVueltaPayload(viaje),
      paquete: prepararPaquetePasajero(viaje),
      motorista,
      pasajero: viaje.pasajero || null,
      inicioViajeAt: viaje.inicioViajeAt || null,
      finViajeAt: viaje.finViajeAt || viaje.updatedAt || null,
      createdAt: viaje.createdAt,
      referenciaPago: viaje.referenciaPago || null,
      codigoPago: viaje.codigoPago || null,
    },
  };
}

function prepararWalletDiscount(viaje) {
  const discountAmount = Number(viaje.descuentoWallet || 0);
  const rate = Number(viaje.descuentoWalletRate || 0);
  if (viaje.metodoPago !== "wallet" || discountAmount <= 0 || rate <= 0) return null;

  return {
    enabled: true,
    basePrice: Number(viaje.precioBase || viaje.precio || 0),
    finalPrice: Number(viaje.precio || 0),
    discountAmount,
    rate,
    percentage: Number((rate * 100).toFixed(2)),
    label: "Remise Wallet",
  };
}

async function obtenerUltimaPosicion(motoristaId) {
  const raw = await redis.get(`motorista:pos:${motoristaId}`);

  if (raw) {
    try {
      const pos = JSON.parse(raw);
      const lat = Number(pos.lat);
      const lng = Number(pos.lng);
      const heading = pos.heading == null ? null : Number(pos.heading);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          lat,
          lng,
          heading: Number.isFinite(heading) ? heading : null
        };
      }
    } catch {}
  }

  const data = await redis.hgetall(`motorista:data:${motoristaId}`);
  const lat = Number(data?.lat);
  const lng = Number(data?.lng);

  const heading = data?.heading == null ? null : Number(data.heading);

  return Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng, heading: Number.isFinite(heading) ? heading : null }
    : null;
}

function prepararPaquetePasajero(viaje) {
  if ((viaje.tipo || "viaje") !== "envio" || !viaje.paquete) return null;

  return {
    pesoKg: viaje.paquete.pesoKg,
    descripcion: viaje.paquete.descripcion || "",
    instrucciones: viaje.paquete.instrucciones || "",
    codigoEntrega: viaje.paquete.codigoEntrega || null,
    codigoEntregaConfirmadoAt: viaje.paquete.codigoEntregaConfirmadoAt || null
  };
}

function prepararMotorista(motoristaDoc, posicion) {
  const motorista = formatMotorista(motoristaDoc);
  if (!motorista || !posicion) return motorista;

  return {
    ...motorista,
    heading: posicion.heading ?? motorista.heading ?? null,
    lat: posicion.lat,
    lng: posicion.lng,
    ubicacion: {
      ...(motorista.ubicacion || {}),
      lat: posicion.lat,
      lng: posicion.lng
    }
  };
}

async function obtenerProximoDestino(viajeId, viaje) {
  const rawCtx = await redis.get(`viaje:ctx:${viajeId}`);

  if (rawCtx) {
    try {
      const ctx = JSON.parse(rawCtx);
      if (ctx?.proximoDestino) return ctx.proximoDestino;
    } catch {}
  }

  if (["asignado", "llego"].includes(viaje.estado)) return viaje.origen || null;
  if (viaje.estado === "en_curso" && viaje.idaVuelta?.estado === "retorno_en_curso") return viaje.origen || null;
  if (viaje.estado === "en_curso") return viaje.destino || null;
  if (viaje.estado === "reservado") return viaje.proximoDestino || viaje.origen || null;
  return null;
}

async function guardarContexto(viajeId, viaje, motoristaId, proximoDestino) {
  await redis.set(
    `viaje:ctx:${viajeId}`,
    JSON.stringify({
      estado: viaje.estado,
      origen: viaje.origen || null,
      destino: viaje.destino || null,
      proximoDestino,
      idaVuelta: prepararIdaVueltaPayload(viaje),
      motoristaId: motoristaId || null,
      pasajeroId: viaje.pasajero?.toString() || null
    }),
    "EX",
    600
  );
}
