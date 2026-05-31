const Viaje = require("../models/Viaje");
const WalletService = require("./wallet.service");
const crypto = require("crypto");

class PaymentService {

  // =====================================================
  // 🚀 INICIAR PAGO
  // =====================================================
  static async iniciarPago({ viajeId, metodoPago }) {
    if (!viajeId || !metodoPago) {
      throw new Error("Datos incompletos");
    }

    const viaje = await Viaje.findById(viajeId);
    if (!viaje) throw new Error("Viaje no existe");

    if (viaje.estadoPago && viaje.estadoPago !== "pendiente") {
      return {
        ok: true,
        estadoPago: viaje.estadoPago,
        mensaje: "Pago ya iniciado anteriormente"
      };
    }

    viaje.metodoPago = metodoPago;

    // ==========================================
    // 💵 EFECTIVO
    // ==========================================
    if (metodoPago === "efectivo") {
      viaje.estadoPago = "pendiente";
      await viaje.save();

      return {
        ok: true,
        metodo: "efectivo",
        estadoPago: "pendiente"
      };
    }

    // ==========================================
    // 💳 WALLET (ESCROW INMEDIATO)
    // ==========================================
    if (metodoPago === "wallet") {
      viaje.estadoPago = "pendiente";
      await viaje.save();

      await WalletService.bloquearViaje(viaje._id);

      return {
        ok: true,
        metodo: "wallet",
        estadoPago: "saldoBloqueado"
      };
    }

    // ==========================================
    // 🌍 PASARELA EXTERNA
    // ==========================================
    const reference = this.generarReferencia();

    viaje.referenciaPago = reference;
    viaje.estadoPago = "pendiente";
    await viaje.save();

    return {
      ok: true,
      metodo: metodoPago,
      reference,
      estadoPago: "pendiente",
      urlPago: this.generarURLPago(reference, viaje.precio)
    };
  }

  // =====================================================
  // 🔔 CALLBACK PASARELA
  // =====================================================
  static async procesarCallback({ reference, status }) {

    if (!reference) {
      throw new Error("Referencia inválida");
    }

    const viaje = await Viaje.findOne({ referenciaPago: reference });
    if (!viaje) throw new Error("Viaje no encontrado");

    // 🛑 Idempotencia
    if (viaje.estadoPago === "saldoBloqueado" || viaje.estadoPago === "pagado") {
      return { ok: true, mensaje: "Pago ya procesado" };
    }

    if (status !== "SUCCESS") {
      viaje.estadoPago = "fallido";
      await viaje.save();
      return { ok: true };
    }

    // 🔐 Bloqueamos en wallet como escrow
    await WalletService.bloquearViaje(viaje._id);

    return { ok: true };
  }

  // =====================================================
  // 🔎 CONSULTAR ESTADO
  // =====================================================
  static async estadoPago(viajeId) {
    const viaje = await Viaje.findById(viajeId);
    if (!viaje) throw new Error("Viaje no existe");

    return {
      estadoPago: viaje.estadoPago,
      metodoPago: viaje.metodoPago,
      referenciaPago: viaje.referenciaPago || null
    };
  }

  // =====================================================
  // 🔐 GENERAR REFERENCIA SEGURA
  // =====================================================
  static generarReferencia() {
    return "GM-" + crypto.randomBytes(6).toString("hex").toUpperCase();
  }

  // =====================================================
  // 🌍 GENERAR URL DE PAGO (SANDBOX / PROD)
  // =====================================================
  static generarURLPago(reference, monto) {
    const baseURL = process.env.PAYMENT_BASE_URL || "https://sandbox.BeGO.app/pagar";
    return `${baseURL}/${reference}?monto=${monto}`;
  }
}

module.exports = PaymentService;