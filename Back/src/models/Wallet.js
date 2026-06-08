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
    },

    saldoBloqueado: {
      type: Number,
      default: 0,
      min: 0,
    },

    gananciaEfectivo: {
      type: Number,
      default: 0,
      min: 0,
    },

    comisionPendiente: {
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

WalletSchema.methods.registrarViajeEfectivo = function ({ ganancia, comision, ref = null }) {
  const neto = Number(ganancia);
  const deuda = Number(comision);

  if (!Number.isFinite(neto) || neto < 0) {
    throw new Error("Ganancia invalida para viaje en efectivo");
  }

  if (!Number.isFinite(deuda) || deuda < 0) {
    throw new Error("Comision invalida para viaje en efectivo");
  }

  if (neto > 0) {
    this.gananciaEfectivo += neto;
    this.movimientos.push({
      tipo: "ganancia_efectivo",
      monto: neto,
      descripcion: "Ganancia recibida en efectivo",
      ref,
    });
  }

  if (deuda > 0) {
    this.comisionPendiente += deuda;
    this.movimientos.push({
      tipo: "comision_pendiente",
      monto: -deuda,
      descripcion: "Comision BeGO pendiente por efectivo",
      ref,
    });
  }
};

WalletSchema.methods.pagarComisionPendiente = function (monto, ref = null) {
  const valor = Number(monto);

  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("Monto invalido para pagar comision");
  }

  if (this.saldo < valor) {
    throw new Error("Saldo disponible insuficiente");
  }

  if (this.comisionPendiente < valor) {
    throw new Error("El monto supera la comision pendiente");
  }

  this.saldo -= valor;
  this.comisionPendiente -= valor;
  this.movimientos.push({
    tipo: "pago_comision_enviada",
    monto: -valor,
    descripcion: "Pago de comision pendiente a BeGO",
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

function redondear(valor) {
  return Math.round(Number(valor || 0) * 100) / 100;
}

WalletSchema.methods.normalizarDeudaLegacy = function () {
  const saldoActual = redondear(this.saldo);
  if (saldoActual >= 0) return false;

  const deudaLegacy = Math.abs(saldoActual);
  this.saldo = 0;
  this.comisionPendiente = redondear(Number(this.comisionPendiente || 0) + deudaLegacy);
  this.movimientos.push({
    tipo: "migracion_comision_pendiente",
    monto: -deudaLegacy,
    descripcion: "Saldo negativo migrado a comision pendiente",
    ref: "MIGRACION-COMISION",
  });

  return true;
};

WalletSchema.pre("save", function () {
  this.normalizarDeudaLegacy();
  this.saldo = Math.round(Number(this.saldo || 0) * 100) / 100;
  this.saldoBloqueado = Math.round(Number(this.saldoBloqueado || 0) * 100) / 100;
  this.gananciaEfectivo = Math.round(Number(this.gananciaEfectivo || 0) * 100) / 100;
  this.comisionPendiente = Math.round(Number(this.comisionPendiente || 0) * 100) / 100;

  if (this.saldoBloqueado < 0) {
    throw new Error("saldoBloqueado no puede ser negativo");
  }

  if (this.gananciaEfectivo < 0) {
    throw new Error("gananciaEfectivo no puede ser negativa");
  }

  if (this.comisionPendiente < 0) {
    throw new Error("comisionPendiente no puede ser negativa");
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
