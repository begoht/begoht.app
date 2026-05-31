require("dotenv").config();
const mongoose = require("mongoose");

// Conexión a MongoDB
const mongoUri = "mongodb://127.0.0.1:27017/BeGO";

(async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("🟢 Conectado a MongoDB");

    const db = mongoose.connection.db;

    // Eliminar índice conflictivo de 'telefono'
    const indexes = await db.collection("users").indexes();
    const telefonoIndex = indexes.find(idx => idx.key && idx.key.telefono === 1);

    if (telefonoIndex) {
      console.log("⚠️ Eliminando índice conflictivo 'telefono'");
      await db.collection("users").dropIndex("telefono_1");
      console.log("✅ Índice eliminado");
    } else {
      console.log("✅ No hay índice conflictivo 'telefono'");
    }

    // Opcional: crear índice único y sparse para 'telefono'
    console.log("🔧 Creando índice único sparse para 'telefono'");
    await db.collection("users").createIndex({ telefono: 1 }, { unique: true, sparse: true });
    console.log("✅ Índice único sparse creado");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
