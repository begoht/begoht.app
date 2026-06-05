const mongoose = require("mongoose");

const AdminAuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entity: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ip: {
      type: String,
      default: "",
      select: false,
    },
    userAgent: {
      type: String,
      default: "",
      select: false,
    },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.AdminAuditLog ||
  mongoose.model("AdminAuditLog", AdminAuditLogSchema);
