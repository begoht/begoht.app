require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("./models/User"); // tu modelo User

const main = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/BeGO");
    console.log("🟢 MongoDB conectado");

    // Revisar si ya hay un usuario pasajero de prueba
    let user = await User.findOne({ email: "demo@pasajero.com" });

    if (!user) {
      // Crear usuario pasajero demo
      const hashedPassword = await bcrypt.hash("123456", 10); // password demo
      user = await User.create({
        nombre: "Pasajero Demo",
        email: "demo@pasajero.com",
        rol: "pasajero",
        activo: true,
        password: hashedPassword,
        foto: null,
      });
      console.log("🟢 Usuario pasajero demo creado");
    } else {
      console.log("🟢 Usuario pasajero demo ya existe");
    }

    const token = jwt.sign(
      { id: "123", nombre: "Pasajero Demo", rol: "pasajero" },
      "BeGO_super_secreto_2025", // debe ser igual a tu JWT_SECRET
      { expiresIn: "1h" }
    );
    
    console.log(token);

    console.log("\n🔑 Token válido generado:");
    console.log(token);
    console.log("\n💾 Para usarlo en tu frontend:");
    console.log(`localStorage.setItem("token", "${token}");`);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
