const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");

mongoose.connect(process.env.MONGO_URI);

(async () => {
  const existe = await Wallet.findOne({ tipo: "BeGO" });
  if (existe) {
    console.log("BeGO wallet ya existe");
    process.exit();
  }

  await Wallet.create({
    tipo: "BeGO",
    saldo: 0
  });

  console.log("🔥 Wallet BeGO creado");
  process.exit();
})();
