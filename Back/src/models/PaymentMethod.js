const mongoose = require("mongoose");

const EncryptedValueSchema = new mongoose.Schema(
  {
    iv: { type: String, required: true },
    tag: { type: String, required: true },
    data: { type: String, required: true },
  },
  { _id: false }
);

const PaymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["moncash", "natcash"],
      required: true,
      lowercase: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["mobile_money"],
      default: "mobile_money",
    },

    accountName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    phoneEncrypted: {
      type: EncryptedValueSchema,
      required: true,
      select: false,
    },

    phoneHash: {
      type: String,
      required: true,
      index: true,
      select: false,
    },

    phoneLast4: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 4,
    },

    phoneCountry: {
      type: String,
      default: "HT",
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    audit: {
      linkedIpHash: { type: String, default: null, select: false },
      updatedIpHash: { type: String, default: null, select: false },
    },
  },
  { timestamps: true }
);

PaymentMethodSchema.index({ userId: 1, provider: 1 }, { unique: true });
PaymentMethodSchema.index({ provider: 1, phoneHash: 1 }, { unique: true });

module.exports =
  mongoose.models.PaymentMethod ||
  mongoose.model("PaymentMethod", PaymentMethodSchema);
