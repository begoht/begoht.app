const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const motoristasRoutes = require("./routes/motoristas.routes");

const app = express();
const path = require("path");

app.use(express.static(path.join(__dirname, "../public")));


app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/motoristas", motoristasRoutes);
app.use("/api", require("./routes/launch"));

app.get("/", (req, res) => res.send("🚀 BeGO Backend OK"));

app.use((req, res) => {
  res.status(404).json({ msg: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ msg: "Error interno del servidor" });
});

module.exports = app;
