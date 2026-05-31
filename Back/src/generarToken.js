require("dotenv").config();
const jwt = require("jsonwebtoken");

const payload = {
  id: "695ae14f7880982f0e9dd1f1",
  nombre: "Pasajero Demo",
  rol: "pasajero"
};

// ⛔ SIN expiresIn (token infinito para dev)
const token = jwt.sign(payload, process.env.JWT_SECRET);

