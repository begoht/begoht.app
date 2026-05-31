const jwt = require("jsonwebtoken");
const User = require("../models/User"); // 👈 Asegúrate de importar tu modelo

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1️⃣ Verificar header
    if (!authHeader) {
      return res.status(401).json({ msg: "Sin token" });
    }

    // 2️⃣ Formato: Bearer TOKEN
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ msg: "Formato de token inválido" });
    }

    const token = parts[1];

    // 3️⃣ Verificar token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Si el token es válido, inyectamos y seguimos
      req.user = {
        id: decoded.id,
        nombre: decoded.nombre,
        rol: decoded.rol,
      };
      return next();

    } catch (error) {
      // 4️⃣ Manejo especial de expiración
      if (error.name === "TokenExpiredError") {
        const payloadInseguro = jwt.decode(token);

        if (payloadInseguro && payloadInseguro.id) {
          // Buscamos al usuario en la DB para ver su estado actual
          const user = await User.findById(payloadInseguro.id).lean();

          // ✅ CONDICIÓN: Si es pasajero y está en un viaje activo, lo dejamos pasar
          if (user && user.rol === "pasajero" && user.enViaje === true) {
            console.log(`⚠️ Token expirado pero Pasajero ${user.nombre} está en viaje activo. Acceso concedido.`);
            
            req.user = {
              id: user._id.toString(),
              nombre: user.nombre,
              rol: user.rol,
            };
            return next();
          }
        }
        return res.status(401).json({ msg: "Sesión expirada" });
      }

      throw error; // Si es otro error (token malformado, etc.), va al catch principal
    }

  } catch (error) {
    console.error("🔴 JWT ERROR:", error.message);
    return res.status(401).json({ msg: "Token inválido o expirado" });
  }
};