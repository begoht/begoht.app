const Viaje = require("../../../../models/Viaje");

module.exports = {
  findActivo(pasajeroId) {
    return Viaje.findOne({
      pasajero: pasajeroId,
      estado: { $in: ["buscando", "reservado", "asignado", "llego", "en_curso"] },
    }).lean();
  },

  findReplay(pasajeroId) {
    return Viaje.findOne({
      pasajero: pasajeroId,
      estado: {
        $in: [
          "buscando",
          "ofertando",
          "reservado",
          "asignado",
          "llego",
          "en_curso",
        ],
      },
    })
      .populate("motorista")
      .sort({ createdAt: -1 })
      .lean();
  },

  findFinalizadoParaPasajero(pasajeroId, viajeId) {
    return Viaje.findOne({
      _id: viajeId,
      pasajero: pasajeroId,
      estado: "finalizado",
    })
      .populate("motorista", "nombre apellido telefono foto vehiculo rating ratingCount")
      .populate("pasajero", "nombre apellido telefono email")
      .lean();
  },

  findById(id) {
    return Viaje.findById(id);
  },

  async create(data, options = {}) {
    const [viaje] = await Viaje.create([data], options);
    return viaje;
  },
};
