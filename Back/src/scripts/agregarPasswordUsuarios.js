require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

(async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/BeGO");
    console.log("🟢 MongoDB conectado");

    const passwordPlano = "123456"; // 👉 password temporal
    const hash = await bcrypt.hash(passwordPlano, 10);

    const result = await User.updateMany(
      { password: { $exists: false } }, // 👈 solo usuarios viejos
      { $set: { password: hash } }
    );

    console.log("✅ Usuarios actualizados:", result.modifiedCount);
    console.log("🔐 Password asignada:", passwordPlano);

    process.exit();
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
