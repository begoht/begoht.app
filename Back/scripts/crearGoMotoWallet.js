require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Wallet = require("../src/models/wallet");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // 1️⃣ Buscar o crear usuario BeGO
    let BeGO = await User.findOne({ email: "sistema@BeGO.app" });

    if (!BeGO) {
      BeGO = await User.create({
        nombre: "BeGO",
        email: "sistema@BeGO.app",
        password: "NOLOGIN",
        rol: "admin"
      });
      console.log("👑 Usuario BeGO creado");
    }

    // 2️⃣ Buscar wallet
    let wallet = await Wallet.findOne({ userId: BeGO._id });

    if (!wallet) {
      wallet = await Wallet.create({
        userId: BeGO._id,
        saldo: 0,
        retenido: 0
      });
      console.log("🏦 Wallet BeGO creado");
    } else {
      console.log("🟡 Wallet BeGO ya existe");
    }

    process.exit();
  } catch (e) {
    console.error("❌ Error creando wallet BeGO:", e);
    process.exit(1);
  }
})();
