const mongoose = require("mongoose");

const FareSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
      immutable: true,
    },
    baseFare: {
      type: Number,
      default: 200,
      min: 0,
      max: 100000,
    },
    pricePerKm: {
      type: Number,
      default: 60,
      min: 0,
      max: 100000,
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
  mongoose.models.FareSetting ||
  mongoose.model("FareSetting", FareSettingSchema);
