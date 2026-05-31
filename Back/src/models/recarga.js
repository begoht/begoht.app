const mongoose = require("mongoose");

const RecargaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  numero: String,
  operadora: String,
  monto: Number,
  estado: { type: String, default: "completada" },
  fecha: { type: Date, default: Date.now },

  // 🔐 Firma BeGO
  firmaBeGO: { type: String, unique: true, required: true }
});

module.exports = mongoose.model("Recarga", RecargaSchema);
