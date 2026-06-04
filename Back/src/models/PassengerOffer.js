const mongoose = require("mongoose");

const PassengerOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
      maxlength: 80,
    },
    kicker: {
      type: String,
      trim: true,
      default: "Offre BeGO",
      maxlength: 40,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 180,
    },
    badgeLabel: {
      type: String,
      trim: true,
      default: "BeGO",
      maxlength: 24,
    },
    icon: {
      type: String,
      trim: true,
      default: "fa-gift",
      maxlength: 40,
    },
    theme: {
      type: String,
      enum: ["primary", "package", "wallet", "gold", "emerald", "night"],
      default: "primary",
      index: true,
    },
    placement: {
      type: String,
      enum: ["home", "promos", "both"],
      default: "both",
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "paused", "archived"],
      default: "draft",
      index: true,
    },
    city: {
      type: String,
      trim: true,
      lowercase: true,
      default: "all",
      index: true,
    },
    ctaLabel: {
      type: String,
      trim: true,
      default: "Voir",
      maxlength: 28,
    },
    actionRoute: {
      type: String,
      trim: true,
      default: "#/promos",
      maxlength: 120,
    },
    sortOrder: {
      type: Number,
      default: 100,
      index: true,
    },
    startsAt: {
      type: Date,
      default: null,
      index: true,
    },
    endsAt: {
      type: Date,
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

PassengerOfferSchema.index({
  status: 1,
  placement: 1,
  city: 1,
  sortOrder: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.PassengerOffer ||
  mongoose.model("PassengerOffer", PassengerOfferSchema);
