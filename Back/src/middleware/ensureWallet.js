const Wallet = require("../models/wallet");

module.exports = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        saldo: 0,
        retenido: 0,
        movimientos: []
      });
      console.log("🏦 Wallet creado para", req.user.nombre);
    }

    req.wallet = wallet;
    next();
  } catch (err) {
    console.error("❌ Wallet middleware:", err);
    res.status(500).json({ msg: "Error creando wallet" });
  }
};
