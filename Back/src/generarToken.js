require("dotenv").config();
const jwt = require("jsonwebtoken");

if (process.env.ALLOW_DEV_TOKEN_SCRIPT !== "true") {
  throw new Error("Script deshabilitado. Define ALLOW_DEV_TOKEN_SCRIPT=true solo en desarrollo local.");
}

if (!process.env.JWT_SECRET) {
  throw new Error("Falta JWT_SECRET.");
}

if (!process.env.DEV_TOKEN_USER_ID) {
  throw new Error("Falta DEV_TOKEN_USER_ID.");
}

const payload = {
  id: process.env.DEV_TOKEN_USER_ID,
  nombre: process.env.DEV_TOKEN_USER_NAME || "Pasajero Demo",
  rol: process.env.DEV_TOKEN_ROLE || "pasajero",
  tokenVersion: Number(process.env.DEV_TOKEN_VERSION || 0),
};

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
console.log(token);
