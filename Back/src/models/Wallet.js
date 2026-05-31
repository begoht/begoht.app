const mongoose = require("mongoose");

const MovimientoSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true },
    monto: { type: Number, required: true },
    descripcion: { type: String, default: "" },
    ref: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    fecha: { type: Date, default: Date.now },
  },
  { _id: true }
);

const WalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    saldo: {
      type: Number,
      default: 0,
      min: 0,
    },

    saldoBloqueado: {
      type: Number,
      default: 0,
      min: 0,
    },

    movimientos: [MovimientoSchema],
  },
  { timestamps: true }
);

/* =====================================================
   🔒 MÉTODOS FINANCIEROS
===================================================== */

WalletSchema.methods.recargar = function (monto, tipo = "recarga", ref = null) {
  const valor = Number(monto);

  // Ahora validamos que sea un número y que no sea 0
  if (!Number.isFinite(valor) || valor <= 0)
    throw new Error("Monto inválido para operación");

  this.saldo += valor;

  this.movimientos.push({
    tipo,
    monto: valor,
    descripcion: tipo.replace(/_/g, " "), // Mejora la lectura en el historial
    ref,
  });
};

WalletSchema.methods.bloquear = function (monto, ref = null) {
  if (!Number.isFinite(monto) || monto <= 0)
    throw new Error("Monto inválido para bloqueo");

  if (this.saldo < monto)
    throw new Error("Saldo insuficiente");

  this.saldo -= monto;
  this.saldoBloqueado += monto;

  this.movimientos.push({
    tipo: "bloqueo",
    monto: -monto,
    descripcion: "Fondos en garantía",
    ref,
  });
};

WalletSchema.methods.liberar = function (monto, ref = null) {
  if (!Number.isFinite(monto) || monto <= 0)
    throw new Error("Monto inválido para liberación");

  if (this.saldoBloqueado < monto)
    throw new Error("Fondos saldoBloqueados insuficientes");

  this.saldoBloqueado -= monto;
  this.saldo += monto;

  this.movimientos.push({
    tipo: "liberacion",
    monto,
    descripcion: "Liberación de fondos",
    ref,
  });
};

WalletSchema.methods.capturar = function (monto, ref = null) {
  if (!Number.isFinite(monto) || monto <= 0)
    throw new Error("Monto inválido para captura");

  if (this.saldoBloqueado < monto)
    throw new Error("Escrow insuficiente");

  this.saldoBloqueado -= monto;

  this.movimientos.push({
    tipo: "pago_final",
    monto: -monto,
    descripcion: "Pago final viaje",
    ref,
  });
};

/* =====================================================
   🔒 GARANTÍA EXTRA: NUNCA SALDOS NEGATIVOS
===================================================== */

WalletSchema.pre("save", function () {
  if (this.saldo < 0) {
    throw new Error("Saldo no puede ser negativo");
  }

  if (this.saldoBloqueado < 0) {
    throw new Error("saldoBloqueado no puede ser negativo");
  }
});

WalletSchema.virtual("saldoDisponible").get(function () {
  return this.saldo; // En tu lógica actual, el saldo ya es el neto (porque restas al bloquear)
});

// Asegúrate de que los virtuales se incluyan en el JSON
WalletSchema.set('toJSON', { virtuals: true });
WalletSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
