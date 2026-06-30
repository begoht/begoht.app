const mongoose = require("mongoose");

const AppNotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    audience: {
      type: String,
      enum: ["pasajeros", "motoristas", "todos"],
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    active: { type: Boolean, default: true, index: true },
    delivery: {
      devices: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      pushAvailable: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

AppNotificationSchema.index({ active: 1, audience: 1, createdAt: -1 });

module.exports =
  mongoose.models.AppNotification ||
  mongoose.model("AppNotification", AppNotificationSchema);
