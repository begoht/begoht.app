const mongoose = require("mongoose");

const SoporteChatSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  from: String,
  mensaje: String,
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SoporteChat", SoporteChatSchema);
