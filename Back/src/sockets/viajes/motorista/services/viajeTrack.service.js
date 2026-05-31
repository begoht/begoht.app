// viajeTrack.service.js

const calcularETA = require("../../pasajeros/services/tracking/calcularETA");

module.exports = async ({
  io,
  viaje,
  estado,
  snapshot
}) => {
  try {

    /*************************************************
     * ✅ VALIDACIÓN
     *************************************************/
    if (
      estado !== "asignado" ||
      !snapshot ||
      snapshot.lat == null ||
      snapshot.lng == null ||
      isNaN(snapshot.lat) ||
      isNaN(snapshot.lng)
    ) {
      return;
    }

    /*************************************************
     * 🎯 TARGET
     *************************************************/
    const target = viaje?.origen;

    /*************************************************
     * 📏 ETA + DISTANCIA
     *************************************************/
    let distancia = null;
    let eta = null;

    if (
      target?.lat != null &&
      target?.lng != null
    ) {

      const calc = calcularETA({
        motoristaLat: Number(snapshot.lat),
        motoristaLng: Number(snapshot.lng),

        destinoLat: Number(target.lat),
        destinoLng: Number(target.lng)
      });

      distancia = calc?.distancia ?? null;
      eta = calc?.eta ?? null;
    }

    /*************************************************
     * 📦 PAYLOAD
     *************************************************/
    const payload = {
      viajeId: viaje._id,

      lat: Number(snapshot.lat),
      lng: Number(snapshot.lng),

      estado,

      origen: viaje.origen || null,
      destino: viaje.destino || null,

      proximoDestino: viaje.origen || null,

      distancia,
      eta,

      timestamp: Date.now()
    };

    /*************************************************
     * 📡 EMIT TRACK
     *************************************************/
    io.to(`track:${viaje._id}`).emit(
      "track:posicion",
      payload
    );

    /*************************************************
     * 🔥 COMPAT LEGACY
     *************************************************/
    io.to(`viaje:${viaje._id}`).emit(
      "viaje:posicion",
      {
        lat: payload.lat,
        lng: payload.lng,
        ts: payload.timestamp
      }
    );

  } catch (err) {
    console.error(
      "❌ Error viajeTrack.service:",
      err
    );
  }
};