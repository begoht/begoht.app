const nodemailer = require("nodemailer");
const EmailLog = require("../../models/EmailLog");
const { generarPdfRecibo } = require("./pdf.service");

const emailConfig = {
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465),
  secure: process.env.EMAIL_SECURE != null
    ? String(process.env.EMAIL_SECURE).toLowerCase() !== "false"
    : Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465) === 465,
  user: process.env.EMAIL_USER || process.env.MAIL_USER,
  pass: process.env.EMAIL_PASS || process.env.MAIL_PASS,
  from: process.env.EMAIL_FROM || null,
};

emailConfig.from = emailConfig.from || (emailConfig.user ? `"BeGO" <${emailConfig.user}>` : "");

const emailConfigured = Boolean(emailConfig.user && emailConfig.pass);
const transporter = emailConfigured
  ? nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
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

async function verificarConexionEmail() {
  if (!transporter) {
    return {
      ok: false,
      configured: false,
      message: "EMAIL_USER y EMAIL_PASS no estan configurados",
    };
  }

  try {
    await transporter.verify();
    return {
      ok: true,
      configured: true,
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

  if (!transporter) {
    await registrarEmail({
      viajeId,
      pasajeroId,
      email,
      estado: "error",
      error: "EMAIL_USER y EMAIL_PASS no estan configurados",
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
    const info = await transporter.sendMail({
      from: emailConfig.from,
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
  if (!transporter) throw new Error("EMAIL_USER y EMAIL_PASS no estan configurados");

  return transporter.sendMail({
    from: emailConfig.from,
    to,
    subject: "BeGO email conectado",
    html: `
      <div style="background:#07111f;color:#fff;font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;border-radius:18px;">
        <h1 style="margin:0 0 8px;font-size:28px;">BeGO</h1>
        <p style="color:#cbd5e1;line-height:1.5;">El correo de produccion esta conectado correctamente.</p>
        <div style="margin-top:24px;padding:16px;border:1px solid rgba(96,165,250,.35);border-radius:14px;background:rgba(37,99,235,.16);">
          <strong>Estado:</strong> SMTP activo
        </div>
      </div>
    `,
  });
}

module.exports = { enviarResumenViaje, enviarEmailPrueba, verificarConexionEmail };
