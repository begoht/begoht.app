const mongoose = require("mongoose");

const WalletDiscountSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
      immutable: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 0.5,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 48,
      default: "Remise Wallet",
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
  mongoose.models.WalletDiscountSetting ||
  mongoose.model("WalletDiscountSetting", WalletDiscountSettingSchema);
