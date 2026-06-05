const mongoose = require("mongoose");

const VehiculoSchema = new mongoose.Schema(
  {
    marca: { type: String, trim: true },
    modelo: { type: String, trim: true },
    placa: { type: String, trim: true, uppercase: true },
    color: { type: String, trim: true },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    // ================= PERFIL =================
    nombre: {
      type: String,
      required: true,
      trim: true,
    },

    apellido: {
      type: String,
      trim: true,
      default: "",
    },

    telefono: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    telefonoVerificado: {
      type: Boolean,
      default: false,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
    },

    emailVerificado: {
      type: Boolean,
      default: false,
    },

    foto: {
      type: String,
      default: null,
    },

    // ================= SEGURIDAD =================
    password: {
      type: String,
      required: true,
      select: false,
    },

    // ================= PIN WALLET =================
    pinHash: {
      type: String,
      select: false,
    },
    
    pinIntentos: {
      type: Number,
      default: 0,
    },
    
    pinBloqueadoHasta: {
      type: Date,
      default: null,
    },

    intentosFallidos: {
      type: Number,
      default: 0,
    },

    saldoBloqueado: {
      type: Boolean,
      default: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    refreshToken: {
      type: String,
      default: null,
    },

    // ================= ROL =================
    rol: {
      type: String,
      enum: ["pasajero", "motorista", "admin"],
      default: "pasajero",
    },

    // ================= MOTORISTA =================
    vehiculo: {
      type: VehiculoSchema,
      default: null,
    },

    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalViajes: {
      type: Number,
      default: 0,
    },

    disponible: {
      type: Boolean,
      default: true,
    },

    online: {
      type: Boolean,
      default: false,
    },

    ubicacionActual: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    verificado: {
      type: Boolean,
      default: false},

   /**************** WALLET ID OPCIONAL FUTURO ****************/
    alias: {
      type: String,
      unique: true,
      lowercase: true,
      sparse: true,
      trim: true,
    },
  },
  { timestamps: true }
);


UserSchema.pre("save", async function () {
  // Solo si es nuevo usuario
  if (!this.isNew) return;

  if (!this.alias) {
    const base = this.nombre
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    const random = Math.floor(1000 + Math.random() * 9000);

    this.alias = `${base}${random}`;
  }
});

/* =====================================================
   🔥 WALLET AUTO-CREATION (FIXED & STABLE)
===================================================== */

UserSchema.post("save", async function (doc) {
  try {
    // Solo crear wallet si el documento es nuevo
    if (!doc.isNew) return;

    const Wallet = require("./Wallet"); // ⚠️ Respeta mayúscula exacta

    const existe = await Wallet.findOne({ userId: doc._id });
    if (!existe) {
      await Wallet.create({
        userId: doc._id,
        saldo: 0,
        saldoBloqueado: 0,
      });

      console.log("💰 Wallet creada automáticamente para:", doc.rol);
    }
  } catch (err) {
    console.error("❌ Error creando wallet automática:", err);
  }
});

module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema);
