const mongoose = require("mongoose");

const PagoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  metodo: {
    type: String,
    enum: ["moncash", "natcash", "tarjeta"]
  },
  monto: Number,
  estado: {
    type: String,
    enum: ["pendiente", "exitoso", "fallido"],
    default: "pendiente"
  },
  referencia: String
}, { timestamps: true });

module.exports = mongoose.model("Pago", PagoSchema);
