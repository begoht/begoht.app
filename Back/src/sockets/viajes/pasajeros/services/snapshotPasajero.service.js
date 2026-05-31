const { redis } = require("../../../../config/redis");

const TTL = 60 * 60 * 6; // 6 horas

/*************************************************
 * 🧠 SERIALIZADOR SEGURO
 *************************************************/
function serialize(value) {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }

  return String(value);
}

/*************************************************
 * 🧠 DESERIALIZADOR SEGURO
 *************************************************/
function deserialize(value) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/*************************************************
 * 💾 GUARDAR SNAPSHOT
 *************************************************/
async function actualizarSnapshotPasajero(userId, data = {}) {
  const key = `pasajero:snapshot:${userId}`;

  const clean = {};

  for (const [k, v] of Object.entries(data)) {
    const serialized = serialize(v);
    if (serialized !== undefined) {
      clean[k] = serialized;
    }
  }

  // 🔥 metadata importante
  clean.actualizado = String(Date.now());
  clean.valido = "true"; // 👉 clave para recovery

  if (Object.keys(clean).length) {
    await redis.hset(key, clean);
    await redis.expire(key, TTL);
  }
}

/*************************************************
 * 📦 OBTENER SNAPSHOT
 *************************************************/
async function obtenerSnapshotPasajero(userId) {
  const key = `pasajero:snapshot:${userId}`;
  const data = await redis.hgetall(key);

  if (!data || !Object.keys(data).length) return null;

  // 🔴 snapshot inválido → ignorar
  if (data.valido === "false") return null;

  const parsed = {};

  for (const [k, v] of Object.entries(data)) {
    parsed[k] = deserialize(v);
  }

  return parsed;
}

/*************************************************
 * 🧹 INVALIDAR SNAPSHOT (NO BORRA, SOLO BLOQUEA)
 *************************************************/
async function invalidarSnapshotPasajero(userId) {
  const key = `pasajero:snapshot:${userId}`;

  await redis.hset(key, {
    valido: "false",
    actualizado: String(Date.now())
  });

  // opcional: reducir TTL para limpieza rápida
  await redis.expire(key, 60 * 5); // 5 minutos
}

/*************************************************
 * 💀 ELIMINAR SNAPSHOT COMPLETO
 *************************************************/
async function eliminarSnapshotPasajero(userId) {
  const key = `pasajero:snapshot:${userId}`;
  await redis.del(key);
}

module.exports = {
  actualizarSnapshotPasajero,
  obtenerSnapshotPasajero,
  invalidarSnapshotPasajero,
  eliminarSnapshotPasajero,
};