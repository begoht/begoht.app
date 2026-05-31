const mongoose = require("mongoose");

const EmailLogSchema = new mongoose.Schema({
    viajeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viaje' },
    pasajeroId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    tipo: { type: String, default: 'resumen_viaje' },
    estado: { type: String, enum: ['enviado', 'error'], default: 'enviado' },
    mensajeId: String, // ID que devuelve el proveedor de correo
    error: String,
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model("EmailLog", EmailLogSchema);