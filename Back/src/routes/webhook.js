const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const Viaje = require("../models/Viaje");

function getWebhookSecret() {
  return process.env.PAYMENT_WEBHOOK_SECRET;
}

function parseSignature(value) {
  const signature = String(value || "").trim();
  return signature.startsWith("sha256=")
    ? signature.slice("sha256=".length)
    : signature;
}

function isValidSignature(req) {
  const secret = getWebhookSecret();
  const signature = parseSignature(
    req.get("x-bego-signature") || req.get("x-payment-signature")
  );

  if (!secret || !signature) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function parseMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100) / 100;
}

/*************************************************
 * 🔔 WEBHOOK DE MONCASH / NATCASH
 * Ellos llaman aquí cuando el pago se completa
 *************************************************/
router.post("/pago", async (req, res) => {
  try {
    if (!getWebhookSecret()) {
      return res.status(503).json({ error: "Webhook no configurado" });
    }

    if (!isValidSignature(req)) {
      return res.status(401).json({ error: "Firma invalida" });
    }

    const { codigoPago, status, transaccionId } = req.body;
    const monto = parseMoney(req.body?.monto ?? req.body?.amount);

    if (!codigoPago) {
      return res.status(400).json({ error: "Código requerido" });
    }

    const viaje = await Viaje.findOne({ codigoPago });
    if (!viaje) {
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    if (monto !== null && parseMoney(viaje.precio) !== monto) {
      return res.status(400).json({ error: "Monto invalido" });
    }

    if (status === "SUCCESS") {
      if (!transaccionId) {
        return res.status(400).json({ error: "Transaccion requerida" });
      }

      if (["pagado", "saldoBloqueado"].includes(viaje.estadoPago)) {
        return res.json({ ok: true, idempotent: true });
      }

      viaje.estadoPago = "pagado";
      viaje.transaccionPago = transaccionId;
      await viaje.save();

      console.log("💳 Pago confirmado:", viaje._id);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ webhook:", err);
    res.status(500).json({ error: "Error webhook" });
  }
});

module.exports = router;
