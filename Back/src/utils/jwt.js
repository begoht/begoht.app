const jwt = require("jsonwebtoken");

const generarAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      nombre: user.nombre,
      rol: user.rol,
      tokenVersion: user.tokenVersion, 
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

const generarRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = {
  generarAccessToken,
  generarRefreshToken,
};
