const express = require("express");
const authAdmin = require("../middleware/authAdmin");
const { enviarEmailPrueba, verificarConexionEmail } = require("../services/email/email.service");

const router = express.Router();

router.get("/email/status", authAdmin, async (req, res) => {
  const status = await verificarConexionEmail();
  res.status(status.ok ? 200 : 503).json(status);
});

router.post("/email/test", authAdmin, async (req, res) => {
  const to = String(req.body?.to || req.user?.email || process.env.EMAIL_TEST_TO || process.env.EMAIL_USER || "").trim();

  if (!to) {
    return res.status(400).json({ error: "No hay email destino para la prueba" });
  }

  try {
    const info = await enviarEmailPrueba(to);
    return res.json({
      ok: true,
      to,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Error enviando email de prueba:", error.message);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

module.exports = router;
