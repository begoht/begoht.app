const mongoose = require("mongoose");

const CommissionSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
      immutable: true,
    },
    rate: {
      type: Number,
      default: 0.15,
      min: 0,
      max: 0.5,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CommissionSetting ||
  mongoose.model("CommissionSetting", CommissionSettingSchema);
