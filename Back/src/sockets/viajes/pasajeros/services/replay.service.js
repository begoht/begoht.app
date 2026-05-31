const viajeRepo = require("../repositories/viaje.repository");
const formatMotorista = require("../../../../utils/formatMotorista");
const { redis } = require("../../../../config/redis");

const ESTADOS_BUSQUEDA = ["buscando", "ofertando"];
const ESTADOS_ACTIVOS = ["reservado", "asignado", "llego", "en_curso"];

module.exports = async function replayViaje(socket) {
  const now = Date.now();

  if (socket.data?.replayInFlight || now - (socket.data?.lastReplayAt || 0) < 1000) {
    return;
  }

  socket.data = socket.data || {};
  socket.data.replayInFlight = true;
  socket.data.lastReplayAt = now;

  try {
    const pasajeroId = (socket.user.id || socket.user._id).toString();
    const viaje = await viajeRepo.findReplay(pasajeroId);

    if (!viaje) {
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
        distanciaKm: viaje.distanciaKm,
        metodoPago: viaje.metodoPago,
        origen: viaje.origen?.direccion,
        destino: viaje.destino?.direccion,
        estado: "buscando",
        rutaGeometria: viaje.rutaGeometria || null
      });

      socket.emit("viaje-buscando", {
        viajeId,
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
      distanciaKm: viaje.distanciaKm,
      duracionMin: viaje.duracionMin,
      metodoPago: viaje.metodoPago,
      estadoPago: viaje.estadoPago,
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
        timestamp: Date.now(),
        isReplay: true
      });
    }

    if (posicion) {
      socket.emit("track:posicion", {
        viajeId,
        lat: posicion.lat,
        lng: posicion.lng,
        origen: viaje.origen,
        destino: viaje.destino,
        proximoDestino,
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
      proximoDestino
    });

    console.log(`Replay: estado ${viaje.estado} recuperado para ${pasajeroId}`);
  } catch (error) {
    console.error("Error en replayViaje:", error);
    socket.emit("viaje-sync", { activo: false });
  } finally {
    socket.data.replayInFlight = false;
  }
};

async function obtenerUltimaPosicion(motoristaId) {
  const raw = await redis.get(`motorista:pos:${motoristaId}`);

  if (raw) {
    try {
      const pos = JSON.parse(raw);
      const lat = Number(pos.lat);
      const lng = Number(pos.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    } catch {}
  }

  const data = await redis.hgetall(`motorista:data:${motoristaId}`);
  const lat = Number(data?.lat);
  const lng = Number(data?.lng);

  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function prepararMotorista(motoristaDoc, posicion) {
  const motorista = formatMotorista(motoristaDoc);
  if (!motorista || !posicion) return motorista;

  return {
    ...motorista,
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
      motoristaId: motoristaId || null
    }),
    "EX",
    600
  );
}
