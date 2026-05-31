const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "No token" });

    const token = header.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "Usuario no existe" });

    if (user.rol !== "admin") {
      return res.status(403).json({ error: "Solo admin" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("❌ authAdmin:", err.message);
    res.status(401).json({ error: "Token inválido" });
  }
};
