const Wallet = require("../models/Wallet");
const Viaje = require("../models/Viaje");

module.exports = async function cobrarWallet(req, res, next) {
  try {
    const { viajeId } = req.body;

    const viaje = await Viaje.findById(viajeId);
    if (!viaje) return res.status(404).json({ error: "Viaje no existe" });

    // Solo cobrar si es wallet
    if (viaje.metodoPago !== "wallet") {
      return next();
    }

    // Ya cobrado
    if (viaje.estadoPago === "pagado") {
      return next();
    }

    const wallet = await Wallet.findOne({ userId: viaje.pasajero });

    if (!wallet || wallet.saldo < viaje.precio) {
      return res.status(402).json({
        error: "Saldo insuficiente en Wallet",
        bloquear: true,
      });
    }

    // 💰 Descontar
    wallet.saldo -= viaje.precio;
    await wallet.save();
    await global.emitWalletUpdate(viaje.pasajero);

    // 🔒 Marcar pagado
    viaje.estadoPago = "pagado";
    await viaje.save();

    next();
  } catch (err) {
    console.error("❌ Error cobrarWallet:", err);
    res.status(500).json({ error: "Error cobrando wallet" });
  }
};
