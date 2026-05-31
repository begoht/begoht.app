const { Schema, model } = require("mongoose");

const MotoristaSchema = new Schema({
  nombre: String,
  ubicacion: {
    lat: Number,
    lng: Number,
  },
  disponible: {
    type: Boolean,
    default: true,
  },
});

module.exports = model("Motorista", MotoristaSchema);
