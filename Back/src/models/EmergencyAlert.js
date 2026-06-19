const mongoose = require("mongoose");

const EmergencyAlertSchema = new mongoose.Schema(
  {
    viaje: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Viaje",
      required: true,
      index: true,
    },
    pasajero: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    motorista: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    tipo: {
      type: String,
      enum: ["SOS_PASAJERO", "INCIDENTE"],
      default: "SOS_PASAJERO",
    },
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved", "false_alarm"],
      default: "open",
      index: true,
    },
    ubicacion: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    userAgent: {
      type: String,
      default: "",
      maxlength: 300,
    },
    ip: {
      type: String,
      default: "",
      maxlength: 120,
    },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EmergencyAlertSchema.index({ status: 1, createdAt: -1 });
EmergencyAlertSchema.index({ pasajero: 1, createdAt: -1 });

module.exports =
  mongoose.models.EmergencyAlert ||
  mongoose.model("EmergencyAlert", EmergencyAlertSchema);
