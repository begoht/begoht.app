const mongoose = require("mongoose");

const UbicacionSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    direccion: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const RutaPointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const TrayectoriaPointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PaqueteSchema = new mongoose.Schema(
  {
    pesoKg: { type: Number, min: 0, max: 5, default: null },
    descripcion: { type: String, trim: true, maxlength: 160, default: "" },
    instrucciones: { type: String, trim: true, maxlength: 220, default: "" },
    reglasAceptadas: { type: Boolean, default: false },
    reglasAceptadasAt: { type: Date, default: null },
    codigoEntrega: { type: String, trim: true, maxlength: 4, default: null },
    codigoEntregaConfirmadoAt: { type: Date, default: null },
  },
  { _id: false }
);

const IdaVueltaSchema = new mongoose.Schema(
  {
    disponible: { type: Boolean, default: false },
    solicitada: { type: Boolean, default: false },
    estado: {
      type: String,
      enum: [
        "no_aplica",
        "ida",
        "retorno_pendiente",
        "retorno_en_curso",
        "retorno_cancelado",
        "completado",
      ],
      default: "no_aplica",
    },
    precioIda: { type: Number, default: 0, min: 0 },
    precioVuelta: { type: Number, default: 0, min: 0 },
    precioTotal: { type: Number, default: 0, min: 0 },
    precioBaseIda: { type: Number, default: 0, min: 0 },
    precioBaseTotal: { type: Number, default: 0, min: 0 },
    descuentoWalletIda: { type: Number, default: 0, min: 0 },
    descuentoWalletTotal: { type: Number, default: 0, min: 0 },
    descuentoWalletRate: { type: Number, default: 0, min: 0, max: 0.5 },
    distanciaIdaKm: { type: Number, default: 0, min: 0 },
    distanciaTotalKm: { type: Number, default: 0, min: 0 },
    duracionIdaMin: { type: Number, default: 0, min: 0 },
    duracionTotalMin: { type: Number, default: 0, min: 0 },
    retornoPendienteAt: { type: Date, default: null },
    retornoIniciadoAt: { type: Date, default: null },
    retornoCanceladoAt: { type: Date, default: null },
    retornoCompletadoAt: { type: Date, default: null },
    canceladoPor: {
      type: String,
      enum: ["pasajero", "motorista", "admin", null],
      default: null,
    },
  },
  { _id: false }
);

const RatingViajeSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 1, max: 5, default: null },
    comentario: { type: String, trim: true, maxlength: 280, default: "" },
    tags: { type: [String], default: [] },
    pasajero: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    motorista: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    submittedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const ViajeSchema = new mongoose.Schema(
  {
    pasajero: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pasajeroSocket: {
      type: String,
      required: true,
    },

    motorista: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    motoristaSocket: {
      type: String,
      default: null,
    },

    origen: {
      type: UbicacionSchema,
      required: true,
    },

    destino: {
      type: UbicacionSchema,
      default: null,
    },

    tipo: {
      type: String,
      enum: ["viaje", "envio"],
      default: "viaje",
      index: true,
    },

    paquete: {
      type: PaqueteSchema,
      default: null,
    },

    idaVuelta: {
      type: IdaVueltaSchema,
      default: () => ({ disponible: false, solicitada: false, estado: "no_aplica" }),
    },

    ciudad: {
      type: String,
      trim: true,
      default: "jacmel",
      index: true,
    },

    distanciaKm: { type: Number, default: 0, min: 0 },
    distanciaRealMetros: { type: Number, default: 0, min: 0 },
    precio: { type: Number, default: 0, min: 0 },
    precioBase: { type: Number, default: 0, min: 0 },
    descuentoWallet: { type: Number, default: 0, min: 0 },
    descuentoWalletRate: { type: Number, default: 0, min: 0, max: 0.5 },
    duracionMin: { type: Number, default: 0, min: 0 },

    estado: {
      type: String,
      enum: [
        "buscando",
        "reservado",
        "asignado",
        "llego",
        "en_curso",
        "finalizado",
        "cancelado",
        "expirado",
        "sin_motorista",
        "ofertando",
      ],
      default: "buscando",
    },

    horaAsignado: Date,
    aceptadoEn: Date,
    asignadoEn: Date,
    reservadoEn: Date,
    inicioViajeAt: Date,
    finViajeAt: Date,

    motoristaLlegado: { type: Boolean, default: false },
    cancelFee: { type: Number, default: 0, min: 0 },
    siguienteActivado: { type: Boolean, default: false },
    notificacionProximidadEnviada: { type: Boolean, default: false },

    metodoPago: {
      type: String,
      enum: ["efectivo", "wallet", "moncash", "natcash"],
      required: true,
    },

    estadoPago: {
      type: String,
      enum: [
        "pendiente",
        "esperando_pago",
        "en_escrow",
        "saldoBloqueado",
        "pagado",
        "cancelado",
        "penalizado",
        "reembolsado",
        "fallido",
      ],
      default: "pendiente",
    },

    pagoId: { type: String, default: null },
    referenciaPago: { type: String, default: null, index: true },
    codigoPago: { type: String, default: null, index: true },

    escrow: { type: Number, default: 0, min: 0 },
    comision: { type: Number, default: 0, min: 0 },
    pagoMotorista: { type: Number, default: 0, min: 0 },
    paBeGOrista: { type: Number, default: 0, min: 0 },

    finalizacionProcesada: { type: Boolean, default: false },
    finalizadoPor: {
      type: String,
      enum: ["motorista", "admin", "auto"],
      default: null,
    },
    finalizacionMotivo: { type: String, trim: true, maxlength: 160, default: "" },
    finalizadoPorAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    finalizadoAutomaticamente: { type: Boolean, default: false },

    rating: {
      type: RatingViajeSchema,
      default: null,
    },

    rutaPoints: { type: [RutaPointSchema], default: [] },
    rutaGeometria: { type: mongoose.Schema.Types.Mixed, default: null },
    trayectoriaReal: { type: [TrayectoriaPointSchema], default: [] },

    enMatching: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

ViajeSchema.pre("validate", function syncCamposCompatibles() {
  if (!this.pagoMotorista && this.paBeGOrista) {
    this.pagoMotorista = this.paBeGOrista;
  }

  if (!this.paBeGOrista && this.pagoMotorista) {
    this.paBeGOrista = this.pagoMotorista;
  }

  if (!this.horaAsignado && (this.asignadoEn || this.aceptadoEn)) {
    this.horaAsignado = this.asignadoEn || this.aceptadoEn;
  }
});

ViajeSchema.index({ estado: 1 });
ViajeSchema.index({ motorista: 1, estado: 1 });
ViajeSchema.index({ estado: 1, motorista: 1 });
ViajeSchema.index({ pasajero: 1, estado: 1, createdAt: -1 });
ViajeSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Viaje || mongoose.model("Viaje", ViajeSchema);
