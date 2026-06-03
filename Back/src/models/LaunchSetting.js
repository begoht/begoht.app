const mongoose = require("mongoose");

const LaunchSettingSchema = new mongoose.Schema(
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
    launchAt: {
      type: Date,
      default: null,
    },
    title: {
      type: String,
      trim: true,
      default: "Lancement officiel BeGO",
      maxlength: 80,
    },
    message: {
      type: String,
      trim: true,
      default: "Votre compte est pret. Le service ouvrira officiellement tres bientot.",
      maxlength: 220,
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
  mongoose.models.LaunchSetting ||
  mongoose.model("LaunchSetting", LaunchSettingSchema);
