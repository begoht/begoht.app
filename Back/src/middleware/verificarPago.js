const Viaje = require("../models/Viaje");

module.exports = async (req, res, next) => {
  try {
    const { viajeId } = req.body;

    const viaje = await Viaje.findById(viajeId);

    if (!viaje) {
      return res.status(404).json({ error: "Viaje no existe" });
    }

    // 💵 Efectivo siempre permitido
    if (viaje.metodoPago === "efectivo") {
      return next();
    }

    // 💳 Pagos digitales requieren pagado
    if (viaje.estadoPago !== "pagado") {
      return res.status(403).json({
        error: "Pago no confirmado",
        mensaje: "Debes completar el pago antes de iniciar el viaje",
      });
    }

    next();
  } catch (err) {
    console.error("❌ verificarPago:", err);
    res.status(500).json({ error: "Error verificando pago" });
  }
};
