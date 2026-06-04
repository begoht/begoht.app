const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const Viaje = require("../models/Viaje");
const { PLATFORM_WALLET_ID } = require("../config/constants");
const { getCommissionRate, calculateCommission } = require("./commission.service");

class WalletService {

  // =====================================================
  // 🔐 Asegurar wallet (si no existe la crea)
  // =====================================================
  static async asegurarWallet(userId, session) {
    let wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      wallet = new Wallet({ userId });
      await wallet.save({ session });
    }
    return wallet;
  }

  // =====================================================
  // 🔒 BLOQUEAR FONDOS PARA VIAJE (ESCROW)
  // =====================================================
  static async bloquearViaje(viajeId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const viaje = await Viaje.findById(viajeId).session(session);
      if (!viaje) throw new Error("Viaje no existe");

      // 🛑 Idempotente
      if (viaje.estadoPago === "saldoBloqueado") {
        await session.commitTransaction();
        return;
      }

      if (viaje.estadoPago !== "pendiente") {
        throw new Error("Estado de pago inválido para bloquear");
      }

      const pasajeroWallet = await this.asegurarWallet(viaje.pasajero, session);

      pasajeroWallet.bloquear(viaje.precio, `VIAJE-${viaje._id}`);

      viaje.estadoPago = "saldoBloqueado";
      viaje.escrow = viaje.precio;

      await pasajeroWallet.save({ session });
      await viaje.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  // =====================================================
  // 💰 FINALIZAR VIAJE (CAPTURAR + DISTRIBUIR)
  // =====================================================
  static async finalizarViaje(viajeId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const viaje = await Viaje.findById(viajeId).session(session);
      if (!viaje) throw new Error("Viaje no existe");

      // 🛑 Idempotente
      if (viaje.estadoPago === "pagado") {
        await session.commitTransaction();
        return;
      }

      if (viaje.estadoPago !== "saldoBloqueado") {
        throw new Error("Viaje no tiene fondos saldoBloqueados");
      }

      const pasajeroWallet = await this.asegurarWallet(viaje.pasajero, session);
      const motoristaWallet = await this.asegurarWallet(viaje.motorista, session);
      const plataformaWallet = await this.asegurarWallet(
        new mongoose.Types.ObjectId(PLATFORM_WALLET_ID),
        session
      );

      const total = viaje.escrow;
      if (total <= 0) throw new Error("Escrow inválido");

      const commissionRate = await getCommissionRate({ session });
      const comision = calculateCommission(total, commissionRate);
      const ganaMotorista = total - comision;

      // 🔐 Captura fondos del pasajero
      pasajeroWallet.capturar(total, `VIAJE-${viaje._id}`);

      // 🛵 Paga motorista
      motoristaWallet.recargar(
        ganaMotorista,
        "pago_viaje",
        `VIAJE-${viaje._id}`
      );

      // 🏢 Paga plataforma
      plataformaWallet.recargar(
        comision,
        "comision",
        `VIAJE-${viaje._id}`
      );

      viaje.estadoPago = "pagado";
      viaje.estado = "finalizado";
      viaje.comision = comision;
      viaje.escrow = 0;

      await pasajeroWallet.save({ session });
      await motoristaWallet.save({ session });
      await plataformaWallet.save({ session });
      await viaje.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  // =====================================================
  // ❌ CANCELAR VIAJE
  // =====================================================
  static async cancelarViaje(viajeId, penalidad = 0) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const viaje = await Viaje.findById(viajeId).session(session);
      if (!viaje) throw new Error("Viaje no existe");

      // 🛑 Idempotente
      if (["reembolsado", "penalizado"].includes(viaje.estadoPago)) {
        await session.commitTransaction();
        return;
      }

      if (viaje.estadoPago !== "saldoBloqueado") {
        throw new Error("No hay fondos saldoBloqueados para cancelar");
      }

      const pasajeroWallet = await this.asegurarWallet(viaje.pasajero, session);

      const total = viaje.escrow;

      if (penalidad > 0) {
        if (penalidad > total) {
          throw new Error("Penalidad mayor al escrow");
        }

        // Captura penalidad
        pasajeroWallet.capturar(penalidad, `PENALIDAD-${viaje._id}`);

        // Devuelve resto
        pasajeroWallet.liberar(
          total - penalidad,
          `REEMBOLSO-${viaje._id}`
        );

        viaje.estadoPago = "penalizado";
      } else {
        pasajeroWallet.liberar(
          total,
          `REEMBOLSO-${viaje._id}`
        );

        viaje.estadoPago = "reembolsado";
      }

      viaje.estado = "cancelado";
      viaje.escrow = 0;

      await pasajeroWallet.save({ session });
      await viaje.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

module.exports = WalletService;
