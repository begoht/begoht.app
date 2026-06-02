const mongoose = require("mongoose");

const RecargaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  numero: { type: String, trim: true },
  operadora: { type: String, enum: ["digicel", "natcom", null], default: null },
  monto: { type: Number, required: true, min: 1 },
  tipo: {
    type: String,
    enum: ["recarga_celular", "recarga_wallet"],
    default: "recarga_celular"
  },
  metodoPago: {
    type: String,
    enum: ["wallet", "moncash", "natcash"],
    default: "wallet"
  },
  estado: {
    type: String,
    enum: ["pendiente", "completada", "fallida"],
    default: "completada"
  },
  fecha: { type: Date, default: Date.now },

  // 🔐 Firma BeGO
  firmaBeGO: { type: String, unique: true, required: true }
});

module.exports = mongoose.model("Recarga", RecargaSchema);
