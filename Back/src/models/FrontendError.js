const mongoose = require("mongoose");

const FrontendErrorSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["passenger", "driver", "admin", "tracking", "unknown"],
      default: "unknown",
      index: true,
    },
    level: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      default: "error",
      index: true,
    },
    type: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "frontend_error",
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 700,
      default: "",
    },
    stack: {
      type: String,
      maxlength: 4000,
      default: "",
    },
    url: {
      type: String,
      trim: true,
      maxlength: 900,
      default: "",
    },
    route: {
      type: String,
      trim: true,
      maxlength: 180,
      default: "",
    },
    release: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 700,
      default: "",
    },
    platform: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    viewport: {
      width: { type: Number, default: 0, min: 0 },
      height: { type: Number, default: 0, min: 0 },
      dpr: { type: Number, default: 1, min: 0 },
    },
    online: { type: Boolean, default: true },
    ip: { type: String, trim: true, maxlength: 80, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

FrontendErrorSchema.index({ createdAt: -1 });
FrontendErrorSchema.index({ source: 1, level: 1, createdAt: -1 });
FrontendErrorSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.models.FrontendError || mongoose.model("FrontendError", FrontendErrorSchema);
