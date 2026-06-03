const calcularETA = require("../../pasajeros/services/tracking/calcularETA");
const {
  obtenerProximoDestinoReserva,
  obtenerReservaPorMotorista
} = require("../services/reservaRoute.service");

module.exports = async (io, motoristaId, { lat, lng, heading = null }) => {
  try {
    const nLat = Number(lat);
    const nLng = Number(lng);
    const nHeading = heading == null || heading === "" ? null : Number(heading);

    if (Number.isNaN(nLat) || Number.isNaN(nLng)) return;

    const reserva = await obtenerReservaPorMotorista(motoristaId);
    if (!reserva) return;

    const proximoDestino = await obtenerProximoDestinoReserva(motoristaId);
    const target = proximoDestino || reserva.origen;

    const calc = calcularETA({
      motoristaLat: nLat,
      motoristaLng: nLng,
      destinoLat: target?.lat,
      destinoLng: target?.lng
    });

    const payload = {
      viajeId: reserva._id.toString(),
      lat: nLat,
      lng: nLng,
      heading: nHeading != null && Number.isFinite(nHeading) ? nHeading : null,
      estado: "reservado",
      origen: reserva.origen || null,
      destino: reserva.destino || null,
      proximoDestino: target || null,
      distancia: calc?.distanciaKm ?? null,
      eta: calc?.eta ?? null,
      isReserva: true,
      timestamp: Date.now()
    };

    io
      .to(`track:${payload.viajeId}`)
      .to(`pasajero:${reserva.pasajero.toString()}`)
      .emit("track:posicion", payload);
  } catch (error) {
    console.error("Error en tracking de reserva:", error);
  }
};
