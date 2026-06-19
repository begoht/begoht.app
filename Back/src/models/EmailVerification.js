const mongoose = require("mongoose");

const EmailVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    rol: {
      type: String,
      enum: ["pasajero", "motorista"],
      required: true,
    },
    purpose: {
      type: String,
      enum: ["register", "password_reset"],
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
      default: "email",
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

EmailVerificationSchema.index({ email: 1, rol: 1, purpose: 1, createdAt: -1 });
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports =
  mongoose.models.EmailVerification ||
  mongoose.model("EmailVerification", EmailVerificationSchema);
