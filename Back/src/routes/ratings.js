const express = require("express");
const auth = require("../middleware/authHttp");
const { submitTripRating } = require("../services/rating.service");

const router = express.Router();

router.post("/:id/rating", auth, async (req, res) => {
  try {
    if (req.user.rol !== "pasajero") {
      return res.status(403).json({ error: "Solo el pasajero puede calificar este viaje" });
    }

    const result = await submitTripRating({
      viajeId: req.params.id,
      pasajeroId: req.user.id,
      rating: req.body?.rating,
      comentario: req.body?.comentario,
      tags: req.body?.tags,
    });

    res.json({ ok: true, ...result });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) {
      console.error("Error guardando rating:", err);
    }
    res.status(status).json({ error: err.message || "No se pudo guardar la calificacion" });
  }
});

module.exports = router;
