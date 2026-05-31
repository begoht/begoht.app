const jwt = require("jsonwebtoken");
const Viaje = require("../../models/Viaje");
const { redis } = require("../../config/redis");

const ESTADOS_VISIBLES = ["reservado", "asignado", "llego", "en_curso", "finalizado"];

module.exports = (io, socket) => {
  socket.on("track:join", async (payload, ack) => {
    const token = typeof payload === "string" ? payload : payload?.token;
    await joinTracking(io, socket, token, ack);
  });

  socket.on("seguirViaje", async (payload, ack) => {
    const token = typeof payload === "string" ? payload : payload?.token;
    await joinTracking(io, socket, token, ack);
  });
};

async function joinTracking(io, socket, token, ack) {
  try {
    if (!token) {
      return fail(socket, ack, "TOKEN_REQUIRED", "Link de seguimiento invalido");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.scope && decoded.scope !== "trip_tracking") {
      return fail(socket, ack, "TOKEN_SCOPE", "Link de seguimiento invalido");
    }

    const viaje = await Viaje.findById(decoded.viajeId)
      .select("estado origen destino motorista")
      .lean();

    if (!viaje || !ESTADOS_VISIBLES.includes(viaje.estado)) {
      return fail(socket, ack, "TRIP_UNAVAILABLE", "El viaje no esta disponible");
    }

    const viajeId = viaje._id.toString();
    const room = `track:${viajeId}`;
    socket.join(room);

    const motoristaId = viaje.motorista?.toString() || null;
    const posicion = motoristaId ? await obtenerUltimaPosicion(motoristaId) : {};
    const ctx = await obtenerContexto(viajeId, viaje, motoristaId);

    socket.emit("track:posicion", {
      viajeId,
      lat: posicion.lat ?? null,
      lng: posicion.lng ?? null,
      estado: ctx.estado,
      origen: ctx.origen,
      destino: ctx.destino,
      proximoDestino: ctx.proximoDestino,
      isSnapshot: true,
      timestamp: Date.now()
    });

    if (typeof ack === "function") {
      ack({ ok: true, viajeId });
    }

    console.log(`👀 Tracking publico unido a ${room}`);
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
    fail(socket, ack, code, "El enlace de seguimiento expiro o no es valido");
  }
}

async function obtenerUltimaPosicion(motoristaId) {
  const posRaw = await redis.get(`motorista:pos:${motoristaId}`);
  if (posRaw) {
    try {
      const pos = JSON.parse(posRaw);
      return {
        lat: Number(pos.lat),
        lng: Number(pos.lng)
      };
    } catch {}
  }

  const data = await redis.hgetall(`motorista:data:${motoristaId}`);
  return {
    lat: data?.lat != null ? Number(data.lat) : null,
    lng: data?.lng != null ? Number(data.lng) : null
  };
}

async function obtenerContexto(viajeId, viaje, motoristaId) {
  const raw = await redis.get(`viaje:ctx:${viajeId}`);
  if (raw) {
    try {
      const ctx = JSON.parse(raw);
      if (ctx?.estado) return ctx;
    } catch {}
  }

  const ctx = {
    estado: viaje.estado,
    origen: viaje.origen || null,
    destino: viaje.destino || null,
    motoristaId,
    proximoDestino:
      ["asignado", "llego"].includes(viaje.estado)
        ? viaje.origen
        : viaje.estado === "en_curso"
          ? viaje.destino
          : null
  };

  await redis.set(`viaje:ctx:${viajeId}`, JSON.stringify(ctx), "EX", 600);
  return ctx;
}

function fail(socket, ack, code, message) {
  const payload = { ok: false, code, message };
  socket.emit("track:error", payload);
  if (typeof ack === "function") ack(payload);
}
