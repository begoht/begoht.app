const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    /*************************************************
     * 1️⃣ OBTENER HEADER
     *************************************************/
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        msg: "Falta header Authorization"
      });
    }

    /*************************************************
     * 2️⃣ EXTRAER TOKEN
     *************************************************/
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        ok: false,
        msg: "Token no proporcionado"
      });
    }

    /*************************************************
     * 3️⃣ VERIFICAR JWT
     *************************************************/
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.warn("⛔ JWT inválido o expirado:", err.message);
      return res.status(401).json({
        ok: false,
        msg: "Token inválido o expirado"
      });
    }

    /*************************************************
     * 4️⃣ VALIDAR USUARIO REAL (EXTRA SEGURIDAD)
     *************************************************/
    const user = await User.findById(decoded.id).select(
      "_id nombre alias rol saldoBloqueado tokenVersion"
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        msg: "Usuario no encontrado"
      });
    }

    if (user.saldoBloqueado) {
      return res.status(403).json({
        ok: false,
        msg: "Usuario saldoBloqueado"
      });
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        ok: false,
        msg: "Token desactualizado"
      });
    }

    /*************************************************
     * 5️⃣ INYECTAR USER LIMPIO EN REQUEST
     *************************************************/
    req.user = {
      id: user._id.toString(),
      nombre: user.nombre,
      alias: user.alias,
      rol: user.rol
    };

    next();

  } catch (error) {
    console.error("💥 authHttp CRASH:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error interno de autenticación"
    });
  }
};