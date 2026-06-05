const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
  {
    viaje: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Viaje",
      required: true,
      index: true,
    },
    pasajero: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    motorista: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comentario: {
      type: String,
      trim: true,
      maxlength: 280,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator(tags) {
          return tags.length <= 6 && tags.every((tag) => String(tag).length <= 32);
        },
        message: "Tags de rating invalidos",
      },
    },
  },
  { timestamps: true }
);

RatingSchema.index({ viaje: 1, pasajero: 1 }, { unique: true });
RatingSchema.index({ motorista: 1, createdAt: -1 });

module.exports = mongoose.models.Rating || mongoose.model("Rating", RatingSchema);
