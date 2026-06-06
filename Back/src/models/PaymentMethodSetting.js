const mongoose = require("mongoose");

const MethodSettingSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    unavailableMessage: {
      type: String,
      trim: true,
      maxlength: 140,
      default: "No disponible por ahora.",
    },
  },
  { _id: false }
);

const PaymentMethodSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
      immutable: true,
    },
    methods: {
      efectivo: {
        type: MethodSettingSchema,
        default: () => ({ enabled: true, label: "Efectivo" }),
      },
      wallet: {
        type: MethodSettingSchema,
        default: () => ({ enabled: true, label: "Wallet BeGO" }),
      },
      moncash: {
        type: MethodSettingSchema,
        default: () => ({ enabled: false, label: "MonCash" }),
      },
      natcash: {
        type: MethodSettingSchema,
        default: () => ({ enabled: false, label: "NatCash" }),
      },
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
  mongoose.models.PaymentMethodSetting ||
  mongoose.model("PaymentMethodSetting", PaymentMethodSettingSchema);
