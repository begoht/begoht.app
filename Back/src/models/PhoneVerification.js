const mongoose = require("mongoose");

const PhoneVerificationSchema = new mongoose.Schema(
  {
    telefono: {
      type: String,
      required: true,
      trim: true,
    },
    rol: {
      type: String,
      enum: ["pasajero", "motorista"],
      required: true,
    },
    purpose: {
      type: String,
      enum: ["register"],
      default: "register",
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deliveryProvider: {
      type: String,
      default: "unknown",
    },
    deliveryId: {
      type: String,
      default: "",
    },
    ip: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

PhoneVerificationSchema.index({ telefono: 1, rol: 1, purpose: 1, createdAt: -1 });
PhoneVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports =
  mongoose.models.PhoneVerification ||
  mongoose.model("PhoneVerification", PhoneVerificationSchema);
