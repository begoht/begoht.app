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

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    handle: "BeGO Haiti",
    url: "https://www.facebook.com/search/top?q=bego%20haiti",
  },
  {
    label: "Instagram",
    handle: "@bego.haiti",
    url: "https://www.instagram.com/bego.haiti",
  },
  {
    label: "TikTok",
    handle: "@bego.ht",
    url: "https://www.tiktok.com/@bego.ht",
  },
];

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

function paymentLabel(value) {
  const method = String(value || "").toLowerCase();
  const labels = {
    efectivo: "Especes",
    wallet: "Wallet BeGO",
    moncash: "MonCash",
    natcash: "NatCash",
  };
  return labels[method] || String(value || "Especes");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderSocialLinks() {
  return SOCIAL_LINKS.map((item) => `
    <a href="${item.url}" target="_blank" rel="noopener" style="display:block;text-decoration:none;background:#ffffff;border:1px solid #dbeafe;border-radius:16px;padding:14px 16px;margin:10px 0;color:#0f172a;width:100%;box-sizing:border-box;">
      <span style="display:block;color:#2563eb;font-size:11px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;">${escapeHtml(item.label)}</span>
      <span style="display:block;margin-top:4px;color:#334155;font-size:15px;font-weight:800;">${escapeHtml(item.handle)}</span>
    </a>
  `).join("");
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
  const safePayment = escapeHtml(paymentLabel(metodoPago));
  const safeDistance = escapeHtml(distanciaKm || "0");
  const safeDuration = escapeHtml(tiempo || "0");
  const safeTripId = escapeHtml(viajeId);
  const totalText = formatMoney(total);

  try {
    const info = await sendEmail({
      to: email,
      subject: `Votre recu BeGO est pret - ${fechaActual}`,
      html: `
        <div style="display:none;max-height:0;overflow:hidden;color:transparent;">Votre course BeGO est terminee. Le recu officiel est joint en PDF.</div>
        <div style="background:#f5f7fb;margin:0;padding:10px 8px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbeafe;box-shadow:0 12px 28px rgba(15,23,42,.10);">
            <div style="background:#07111f;padding:24px 20px 22px;border-bottom:5px solid #2563eb;">
              <div style="font-size:33px;line-height:1;font-weight:900;color:#ffffff;letter-spacing:0;">BeGO</div>
              <div style="margin-top:10px;color:#93c5fd;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Recu officiel de course</div>
              <div style="margin-top:14px;color:#cbd5e1;font-size:14px;line-height:1.55;">Merci d'avoir choisi BeGO. Votre recu PDF est joint a cet email.</div>
              <div style="margin-top:18px;">
                <span style="display:inline-block;background:#eff6ff;color:#2563eb;border-radius:999px;padding:9px 13px;font-size:11px;font-weight:900;text-transform:uppercase;">Course terminee</span>
              </div>
              <div style="margin-top:16px;background:rgba(255,255,255,.08);border:1px solid rgba(147,197,253,.24);border-radius:16px;padding:12px;">
                <div style="color:#94a3b8;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">ID voyage</div>
                <div style="margin-top:5px;color:#ffffff;font-size:12px;font-weight:800;word-break:break-all;">${safeTripId}</div>
              </div>
            </div>

            <div style="padding:20px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">${fechaActual}, ${horaActual}</p>
              <h1 style="margin:0 0 18px;font-size:25px;line-height:1.14;color:#0f172a;">Merci, ${safeName}</h1>

              <div style="background:#eef5ff;border:1px solid #bfdbfe;border-radius:18px;padding:18px;margin:0 0 18px;">
                <div style="color:#2563eb;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">Montant paye</div>
                <div style="margin-top:8px;color:#0f172a;font-size:31px;line-height:1.05;font-weight:900;word-break:break-word;">${totalText}</div>
                <div style="margin-top:10px;color:#475569;font-size:13px;">Paiement confirme par BeGO.</div>
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px;">
                <tr>
                  <td style="padding:13px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Paiement</td>
                  <td width="55%" style="padding:13px 8px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:800;text-align:right;word-break:break-word;">${safePayment}</td>
                </tr>
                <tr>
                  <td style="padding:13px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Distance</td>
                  <td width="55%" style="padding:13px 8px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:800;text-align:right;word-break:break-word;">${safeDistance} km</td>
                </tr>
                <tr>
                  <td style="padding:13px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Duree</td>
                  <td width="55%" style="padding:13px 8px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:800;text-align:right;word-break:break-word;">${safeDuration} min</td>
                </tr>
                <tr>
                  <td style="padding:13px 8px;color:#64748b;font-size:13px;">Conducteur</td>
                  <td width="55%" style="padding:13px 8px;color:#0f172a;font-size:14px;font-weight:800;text-align:right;word-break:break-word;">${safeDriver}</td>
                </tr>
              </table>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:18px;">
                <div style="color:#2563eb;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">Depart</div>
                <div style="margin-top:7px;color:#0f172a;font-size:15px;line-height:1.45;font-weight:800;word-break:break-word;">${safeOrigen}</div>
                <div style="height:1px;background:#e2e8f0;margin:16px 0;"></div>
                <div style="color:#2563eb;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">Destination</div>
                <div style="margin-top:7px;color:#0f172a;font-size:15px;line-height:1.45;font-weight:800;word-break:break-word;">${safeDestino}</div>
              </div>

              <div style="background:#07111f;border-radius:18px;padding:20px;color:#ffffff;">
                <div style="font-size:18px;font-weight:900;margin-bottom:8px;">Suivez BeGO Haiti</div>
                <div style="color:#cbd5e1;font-size:13px;line-height:1.5;margin-bottom:16px;">Promotions, securite, assistance et nouveautes sont partages sur nos reseaux officiels.</div>
                <div>${renderSocialLinks()}</div>
              </div>
            </div>

            <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 20px;text-align:center;color:#64748b;font-size:12px;line-height:1.5;">
              BeGO Haiti<br>
              Recu genere automatiquement par la plateforme. Conservez le PDF joint pour votre suivi.
            </div>
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
