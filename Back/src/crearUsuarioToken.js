require("dotenv").config();
const jwt = require("jsonwebtoken");

if (process.env.ALLOW_DEV_TOKEN_SCRIPT !== "true") {
  console.error("Script deshabilitado. Define ALLOW_DEV_TOKEN_SCRIPT=true solo en desarrollo local.");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET.");
  process.exit(1);
}

const payload = {
  id: process.env.DEV_TOKEN_USER_ID,
  nombre: process.env.DEV_TOKEN_USER_NAME || "Pasajero Demo",
  rol: process.env.DEV_TOKEN_ROLE || "pasajero",
  tokenVersion: Number(process.env.DEV_TOKEN_VERSION || 0),
};

if (!payload.id) {
  console.error("Falta DEV_TOKEN_USER_ID.");
  process.exit(1);
}

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
console.log(token);
