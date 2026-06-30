const mongoose = require("mongoose");

const PushDeviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: { type: String, required: true, unique: true, trim: true },
    role: {
      type: String,
      enum: ["pasajero", "motorista"],
      required: true,
      index: true,
    },
    app: {
      type: String,
      enum: ["passenger", "driver"],
      required: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web", "unknown"],
      default: "unknown",
    },
    active: { type: Boolean, default: true, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    lastError: { type: String, default: "", maxlength: 240 },
  },
  { timestamps: true }
);

PushDeviceSchema.index({ role: 1, active: 1 });
PushDeviceSchema.index({ user: 1, active: 1 });

module.exports =
  mongoose.models.PushDevice || mongoose.model("PushDevice", PushDeviceSchema);
