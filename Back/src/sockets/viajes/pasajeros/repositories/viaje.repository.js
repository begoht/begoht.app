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

  findById(id) {
    return Viaje.findById(id);
  },

  async create(data, options = {}) {
    const [viaje] = await Viaje.create([data], options);
    return viaje;
  },
};
