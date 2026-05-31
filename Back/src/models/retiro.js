const mongoose = require("mongoose");

const retiroSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  metodo: { type: String, enum: ["moncash", "natcash"], required: true },
  telefono: { type: String, required: true },
  monto: { type: Number, required: true },
  estado: {
    type: String,
    enum: ["pendiente", "pagado", "rechazado"],
    default: "pendiente",
  },
  creado: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Retiro", retiroSchema);
