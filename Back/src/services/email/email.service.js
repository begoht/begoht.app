const nodemailer = require("nodemailer");
const EmailLog = require("../../models/EmailLog");
const { generarPdfRecibo } = require("./pdf.service");

const emailConfig = {
  provider: String(process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? "resend" : "smtp")).toLowerCase(),
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465),
  secure: process.env.EMAIL_SECURE != null
    ? String(process.env.EMAIL_SECURE).toLowerCase() !== "false"
    : Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465) === 465,
  user: process.env.EMAIL_USER || process.env.MAIL_USER,
  pass: process.env.EMAIL_PASS || process.env.MAIL_PASS,
  resendApiKey: process.env.RESEND_API_KEY || "",
  resendApiUrl: process.env.RESEND_API_URL || "https://api.resend.com",
  from: process.env.EMAIL_FROM || null,
};

emailConfig.from = emailConfig.from || (emailConfig.user ? `"BeGO" <${emailConfig.user}>` : "");

const resendConfigured = emailConfig.provider === "resend" && Boolean(emailConfig.resendApiKey && emailConfig.from);
const smtpConfigured = Boolean(emailConfig.user && emailConfig.pass);
const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
      connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 15000),
      greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 15000),
      socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 20000),
    })
  : null;

function maskEmail(email = "") {
  const [name, domain] = String(email).split("@");
  if (!name || !domain) return "";
  return `${name.slice(0, 2)}***@${domain}`;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `${Math.round(amount).toLocaleString("fr-HT")} HTG`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function activeEmailProvider() {
  if (resendConfigured) return "resend";
  if (transporter) return "smtp";
  return emailConfig.provider;
}

function emailIsConfigured() {
  return resendConfigured || Boolean(transporter);
}

function missingConfigMessage() {
  if (emailConfig.provider === "resend") {
    return "RESEND_API_KEY y EMAIL_FROM no estan configurados";
  }
  return "EMAIL_USER y EMAIL_PASS no estan configurados";
}

async function sendWithResend({ to, subject, html, attachments = [], idempotencyKey }) {
  const response = await fetch(`${emailConfig.resendApiUrl.replace(/\/$/, "")}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${emailConfig.resendApiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: emailConfig.from,
      to,
      subject,
      html,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.isBuffer(attachment.content)
          ? attachment.content.toString("base64")
          : attachment.content,
      })),
    }),
  });

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Resend API error ${response.status}`);
  }

  return { messageId: data.id, provider: "resend", raw: data };
}

async function sendEmail({ to, subject, html, attachments = [], idempotencyKey }) {
  if (resendConfigured) {
    return sendWithResend({ to, subject, html, attachments, idempotencyKey });
  }

  if (transporter) {
    const info = await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject,
      html,
      attachments,
    });

    return { messageId: info.messageId, provider: "smtp", raw: info };
  }

  throw new Error(missingConfigMessage());
}

async function verificarConexionEmail() {
  if (resendConfigured) {
    return {
      ok: true,
      configured: true,
      provider: "resend",
      apiUrl: emailConfig.resendApiUrl,
      from: emailConfig.from,
      message: "Resend API configurado. Usa /api/admin/email/test para validar envio.",
    };
  }

  if (!transporter) {
    return {
      ok: false,
      configured: false,
      provider: emailConfig.provider,
      message: missingConfigMessage(),
    };
  }

  try {
    await transporter.verify();
    return {
      ok: true,
      configured: true,
      provider: "smtp",
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: maskEmail(emailConfig.user),
      from: emailConfig.from,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      provider: "smtp",
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: maskEmail(emailConfig.user),
      message: error.message,
    };
  }
}

verificarConexionEmail().then((status) => {
  if (status.ok) {
    console.log("Servidor de correos BeGO listo");
  } else {
    console.log("Email BeGO no conectado:", status.message);
  }
});

async function registrarEmail({ viajeId, pasajeroId, email, estado, mensajeId, error, tipo = "resumen_viaje" }) {
  try {
    await EmailLog.create({
      viajeId,
      pasajeroId,
      email,
      tipo,
      estado,
      mensajeId,
      error,
      fecha: new Date(),
    });
  } catch (logError) {
    console.error("Error guardando log de email:", logError.message);
  }
}

async function enviarResumenViaje(datos) {
  const {
    email,
    nombrePasajero,
    viajeId,
    pasajeroId,
    distanciaKm,
    tiempo,
    total,
    origen,
    destino,
    nombreConductor,
    metodoPago,
  } = datos;

  if (!email) {
    console.log("Email de recibo omitido: pasajero sin correo.");
    return false;
  }

  if (!emailIsConfigured()) {
    await registrarEmail({
      viajeId,
      pasajeroId,
      email,
      estado: "error",
      error: missingConfigMessage(),
    });
    return false;
  }

  const fechaActual = new Date().toLocaleDateString("fr-HT");
  const horaActual = new Date().toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit" });
  const pdfBuffer = await generarPdfRecibo(datos);

  const safeName = escapeHtml(nombrePasajero || "passager");
  const safeDriver = escapeHtml(nombreConductor || "Socio BeGO");
  const safeOrigen = escapeHtml(origen || "No especificado");
  const safeDestino = escapeHtml(destino || "No especificado");
  const totalText = formatMoney(total);

  try {
    const info = await sendEmail({
      to: email,
      subject: `Votre recu BeGO - ${fechaActual}`,
      html: `
        <div style="background:#07111f;color:#ffffff;font-family:Arial,sans-serif;max-width:620px;margin:auto;border-radius:22px;overflow:hidden;border:1px solid #1e3a8a;">
          <div style="padding:34px 34px 20px;background:#020617;border-bottom:1px solid #2563eb;">
            <h1 style="margin:0;font-size:30px;letter-spacing:0;">BeGO</h1>
            <p style="margin:8px 0 0;color:#93c5fd;">Recu de trajet</p>
          </div>
          <div style="padding:34px;">
            <p style="margin:0 0 10px;color:#94a3b8;font-size:13px;">${fechaActual}, ${horaActual}</p>
            <h2 style="margin:0 0 14px;font-size:28px;line-height:1.15;">Merci, ${safeName}</h2>
            <p style="margin:0 0 28px;color:#cbd5e1;line-height:1.5;">Votre trajet BeGO est termine. Votre recu officiel est joint en PDF.</p>
            <div style="padding:18px;border-radius:16px;background:rgba(37,99,235,.16);border:1px solid rgba(96,165,250,.32);margin-bottom:24px;">
              <div style="font-size:13px;color:#93c5fd;">Total</div>
              <div style="font-size:30px;font-weight:800;">${totalText}</div>
            </div>
            <table width="100%" style="border-collapse:collapse;color:#e5e7eb;">
              <tr><td style="padding:8px 0;color:#94a3b8;">Paiement</td><td style="padding:8px 0;text-align:right;">${escapeHtml(metodoPago || "Efectivo")}</td></tr>
              <tr><td style="padding:8px 0;color:#94a3b8;">Distance</td><td style="padding:8px 0;text-align:right;">${escapeHtml(distanciaKm || "0")} km</td></tr>
              <tr><td style="padding:8px 0;color:#94a3b8;">Temps</td><td style="padding:8px 0;text-align:right;">${escapeHtml(tiempo || "0")} min</td></tr>
              <tr><td style="padding:8px 0;color:#94a3b8;">Conducteur</td><td style="padding:8px 0;text-align:right;">${safeDriver}</td></tr>
            </table>
            <div style="margin-top:24px;padding:18px;border-radius:16px;background:#020617;border:1px solid #1e293b;">
              <p style="margin:0 0 12px;color:#93c5fd;font-size:12px;font-weight:700;">DEPART</p>
              <p style="margin:0 0 18px;color:#e5e7eb;">${safeOrigen}</p>
              <p style="margin:0 0 12px;color:#93c5fd;font-size:12px;font-weight:700;">DESTINATION</p>
              <p style="margin:0;color:#e5e7eb;">${safeDestino}</p>
            </div>
          </div>
          <div style="padding:24px 34px;background:#020617;color:#64748b;font-size:12px;line-height:1.5;">
            BeGO Haiti<br>ID voyage: ${escapeHtml(viajeId)}
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Recu_BeGO_${viajeId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
      idempotencyKey: `receipt-${viajeId}`,
    });

    await registrarEmail({
      viajeId,
      pasajeroId,
      email,
      estado: "enviado",
      mensajeId: info.messageId,
    });

    console.log(`Email de recibo enviado a: ${email}`);
    return true;
  } catch (error) {
    console.error("Error enviando email BeGO:", error.message);
    await registrarEmail({
      viajeId,
      pasajeroId,
      email,
      estado: "error",
      error: error.message,
    });
    return false;
  }
}

async function enviarEmailPrueba(to) {
  if (!to) throw new Error("Destino requerido");
  if (!emailIsConfigured()) throw new Error(missingConfigMessage());

  const providerLabel = activeEmailProvider() === "resend" ? "Resend HTTPS API" : "SMTP";

  return sendEmail({
    to,
    subject: "BeGO email conectado",
    html: `
      <div style="background:#07111f;color:#fff;font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;border-radius:18px;">
        <h1 style="margin:0 0 8px;font-size:28px;">BeGO</h1>
        <p style="color:#cbd5e1;line-height:1.5;">El correo de produccion esta conectado correctamente.</p>
        <div style="margin-top:24px;padding:16px;border:1px solid rgba(96,165,250,.35);border-radius:14px;background:rgba(37,99,235,.16);">
          <strong>Estado:</strong> ${providerLabel} activo
        </div>
      </div>
    `,
    idempotencyKey: `test-${Date.now()}`,
  });
}

module.exports = { enviarResumenViaje, enviarEmailPrueba, verificarConexionEmail };
