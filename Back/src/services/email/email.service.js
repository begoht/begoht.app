const nodemailer = require("nodemailer");
const EmailLog = require("../../models/EmailLog");
const { generarPdfRecibo } = require("./pdf.service");
const { generarMapaRecibo } = require("./receiptMap.service");

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
let resendDomainCache = null;
let resendDomainCacheAt = 0;

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
        ...(attachment.cid ? { content_id: attachment.cid } : {}),
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

function fromDomain() {
  const match = String(emailConfig.from || "").match(/@([^>\s]+)/);
  return match?.[1]?.toLowerCase() || "";
}

async function getResendDomainStatus({ force = false } = {}) {
  if (!resendConfigured) {
    return { ok: false, configured: false, provider: "resend" };
  }

  const now = Date.now();
  if (!force && resendDomainCache && now - resendDomainCacheAt < 5 * 60 * 1000) {
    return resendDomainCache;
  }

  try {
    const response = await fetch(`${emailConfig.resendApiUrl.replace(/\/$/, "")}/domains`, {
      headers: { Authorization: `Bearer ${emailConfig.resendApiKey}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || `Resend domains API ${response.status}`);
    }

    const domain = fromDomain();
    const domains = Array.isArray(payload.data) ? payload.data : [];
    const record = domains.find((item) =>
      String(item.name || "").toLowerCase() === domain
    );
    resendDomainCache = {
      ok: record?.status === "verified",
      configured: true,
      provider: "resend",
      domain,
      domainId: record?.id || null,
      status: record?.status || "not_found",
      message: record?.status === "verified"
        ? "Dominio Resend verificado"
        : `Dominio Resend no verificado: ${record?.status || "not_found"}`,
    };
  } catch (error) {
    resendDomainCache = {
      ok: false,
      configured: true,
      provider: "resend",
      domain: fromDomain(),
      status: "check_failed",
      message: error.message,
    };
  }

  resendDomainCacheAt = now;
  return resendDomainCache;
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
    const domainStatus = await getResendDomainStatus();
    return {
      ...domainStatus,
      apiUrl: emailConfig.resendApiUrl,
      from: emailConfig.from,
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
    estadoPago,
    precioBase,
    descuentoWallet,
    descuentoWalletRate,
    inicioViajeAt,
    finViajeAt,
    tipoServicio,
    ciudad,
    referenciaPago,
    vehiculo,
    placa,
    ratingConductor,
    viajesConductor,
    telefonoConductor,
    ruta,
    origenCoords,
    destinoCoords,
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

  const fechaRecibo = new Date(finViajeAt || Date.now());
  const fechaActual = fechaRecibo.toLocaleDateString("fr-HT", { day: "2-digit", month: "short", year: "numeric" });
  const horaActual = fechaRecibo.toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit" });
  const pdfBuffer = await generarPdfRecibo(datos);
  const mapBuffer = generarMapaRecibo({ origen: origenCoords, destino: destinoCoords, ruta });

  const safeName = escapeHtml(nombrePasajero || "passager");
  const safeDriver = escapeHtml(nombreConductor || "Socio BeGO");
  const safeOrigen = escapeHtml(origen || "No especificado");
  const safeDestino = escapeHtml(destino || "No especificado");
  const safePayment = escapeHtml(paymentLabel(metodoPago));
  const safeDistance = escapeHtml(distanciaKm || "0");
  const safeDuration = escapeHtml(tiempo || "0");
  const safeTripId = escapeHtml(viajeId);
  const safeCity = escapeHtml(ciudad || "Haiti");
  const safeReference = escapeHtml(referenciaPago || `BEGO-${String(viajeId || "").slice(-8).toUpperCase()}`);
  const vehicle = vehiculo && typeof vehiculo === "object" ? vehiculo : {};
  const safeVehicle = escapeHtml(
    [vehicle.marca, vehicle.modelo, vehicle.color].filter(Boolean).join(" · ") || "Moto verifiee BeGO"
  );
  const safePlate = escapeHtml(placa || vehicle.placa || "S/P");
  const safeDriverPhone = escapeHtml(telefonoConductor || "");
  const safeDriverRating = Number.isFinite(Number(ratingConductor))
    ? Number(ratingConductor).toFixed(1)
    : "5.0";
  const safeDriverTrips = Math.max(0, Math.round(Number(viajesConductor || 0)));
  const isDelivery = tipoServicio === "envio";
  const serviceLabel = isDelivery ? "Livraison BeGO" : "Course BeGO";
  const baseAmount = Math.max(Number(precioBase || 0), Number(total || 0) + Number(descuentoWallet || 0));
  const discountAmount = Math.max(0, Number(descuentoWallet || 0));
  const discountPercent = Math.max(0, Math.round(Number(descuentoWalletRate || 0) * 100));
  const discountRow = discountAmount > 0
    ? `<tr><td style="padding:7px 0;color:#6b7280;font-size:12px;">Remise Wallet${discountPercent ? ` (${discountPercent}%)` : ""}</td><td style="padding:7px 0;color:#15803d;font-size:12px;font-weight:800;text-align:right;">-${formatMoney(discountAmount)}</td></tr>`
    : "";
  const totalText = formatMoney(total);
  const pickupTime = new Date(inicioViajeAt || fechaRecibo).toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit" });

  try {
    const info = await sendEmail({
      to: email,
      subject: `Merci d'avoir choisi BeGO - recu du ${fechaActual}`,
      html: `
        <div style="display:none;max-height:0;overflow:hidden;color:transparent;">Merci d'avoir utilise BeGO. Total ${totalText}. Votre recu PDF est joint.</div>
        <div style="margin:0;padding:0;background:#eef0f3;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="padding:18px 28px;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:25px;font-weight:900;letter-spacing:-1px;color:#111827;"><span style="color:#2563eb;">Be</span>GO</td>
                <td style="text-align:right;color:#6b7280;font-size:11px;">${fechaActual} · ${horaActual}</td>
              </tr></table>
            </div>

            <div style="padding:30px 28px 25px;background:#f4f4f5;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td valign="middle">
                  <div style="color:#2563eb;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(serviceLabel)} terminee</div>
                  <h1 style="margin:9px 0 8px;color:#09090b;font-size:30px;line-height:1.08;letter-spacing:-1px;">Merci d'avoir choisi BeGO, ${safeName}</h1>
                  <p style="margin:0;color:#52525b;font-size:13px;line-height:1.5;">Nous esperons que vous avez apprecie votre ${isDelivery ? "livraison" : "trajet"}. Voici votre recu complet.</p>
                </td>
                <td width="90" valign="middle" style="text-align:right;">
                  <div style="display:inline-block;width:72px;height:72px;line-height:72px;text-align:center;border-radius:50%;background:#ffffff;box-shadow:0 8px 24px rgba(17,24,39,.12);font-size:36px;">${isDelivery ? "📦" : "🛵"}</div>
                </td>
              </tr></table>
            </div>

            <div style="padding:0 28px;">
              <div style="padding:24px 0;border-bottom:1px solid #e5e7eb;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="font-size:17px;font-weight:900;">Total</td>
                  <td style="font-size:23px;font-weight:900;text-align:right;white-space:nowrap;">${totalText}</td>
                </tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:15px;padding-top:12px;border-top:1px dashed #d1d5db;">
                  <tr><td style="padding:7px 0;color:#6b7280;font-size:12px;">Tarif ${isDelivery ? "de livraison" : "de la course"}</td><td style="padding:7px 0;font-size:12px;font-weight:800;text-align:right;">${formatMoney(baseAmount)}</td></tr>
                  ${discountRow}
                  <tr><td style="padding:12px 0 0;color:#111827;font-size:12px;font-weight:900;border-top:1px solid #e5e7eb;">Total facture</td><td style="padding:12px 0 0;font-size:12px;font-weight:900;text-align:right;border-top:1px solid #e5e7eb;">${totalText}</td></tr>
                </table>
              </div>

              <div style="padding:24px 0;border-bottom:1px solid #e5e7eb;">
                <h2 style="margin:0 0 15px;font-size:17px;">Paiement</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td width="44" valign="middle"><div style="width:38px;height:32px;line-height:32px;text-align:center;color:#fff;background:#111827;border-radius:7px;font-size:15px;">$</div></td>
                  <td><div style="font-size:13px;font-weight:900;">${safePayment}</div><div style="margin-top:3px;color:#6b7280;font-size:10px;">${safeReference}</div></td>
                  <td style="font-size:13px;font-weight:900;text-align:right;white-space:nowrap;">${totalText}</td>
                </tr></table>
                <div style="margin-top:17px;padding-top:14px;border-top:1px solid #e5e7eb;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="color:#6b7280;font-size:10px;line-height:1.4;">Le recu officiel est joint a cet email.</td>
                    <td style="text-align:right;"><span style="display:inline-block;padding:9px 14px;border-radius:999px;background:#f3f4f6;color:#111827;font-size:10px;font-weight:900;">⬇ Telecharger le PDF</span></td>
                  </tr></table>
                </div>
              </div>

              <div style="padding:24px 0;border-bottom:1px solid #e5e7eb;">
                <h2 style="margin:0 0 15px;font-size:17px;">Details du ${isDelivery ? "service" : "trajet"}</h2>
                <div style="margin-bottom:18px;">
                  <span style="display:inline-block;margin:0 5px 5px 0;padding:7px 9px;border-radius:7px;background:#f3f4f6;color:#4b5563;font-size:10px;">${safeDistance} km</span>
                  <span style="display:inline-block;margin:0 5px 5px 0;padding:7px 9px;border-radius:7px;background:#f3f4f6;color:#4b5563;font-size:10px;">${safeDuration} min</span>
                  <span style="display:inline-block;margin:0 5px 5px 0;padding:7px 9px;border-radius:7px;background:#f3f4f6;color:#4b5563;font-size:10px;">${safeCity}</span>
                </div>
                <img src="cid:bego-route-map" width="544" alt="Carte du trajet BeGO" style="display:block;width:100%;height:auto;margin:0 0 18px;border:0;border-radius:12px;background:#eef2f3;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td width="20" valign="top"><div style="width:8px;height:8px;margin-top:4px;border:2px solid #111827;border-radius:50%;"></div></td><td style="padding:0 0 18px;"><div style="color:#9ca3af;font-size:9px;font-weight:800;text-transform:uppercase;">${escapeHtml(pickupTime)} · Depart</div><div style="margin-top:4px;font-size:12px;font-weight:800;line-height:1.4;">${safeOrigen}</div></td></tr>
                  <tr><td width="20" valign="top"><div style="width:9px;height:9px;margin-top:4px;background:#111827;border-radius:2px;"></div></td><td><div style="color:#9ca3af;font-size:9px;font-weight:800;text-transform:uppercase;">${escapeHtml(horaActual)} · Destination</div><div style="margin-top:4px;font-size:12px;font-weight:800;line-height:1.4;">${safeDestino}</div></td></tr>
                </table>
              </div>

              <div style="padding:24px 0;border-bottom:1px solid #e5e7eb;">
                <h2 style="margin:0 0 15px;font-size:17px;">${isDelivery ? "Livre par" : "Votre conducteur"}</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td width="48"><div style="width:42px;height:42px;line-height:42px;text-align:center;border-radius:50%;background:#2563eb;color:#fff;font-size:16px;font-weight:900;">${escapeHtml(String(nombreConductor || "B").slice(0, 1).toUpperCase())}</div></td>
                  <td><div style="font-size:13px;font-weight:900;">${safeDriver}</div><div style="margin-top:3px;color:#6b7280;font-size:10px;">${safeVehicle}</div><div style="margin-top:3px;color:#9ca3af;font-size:9px;">Plaque ${safePlate}${safeDriverPhone ? ` · ${safeDriverPhone}` : ""}</div></td>
                  <td style="text-align:right;"><span style="display:inline-block;padding:7px 9px;border-radius:999px;background:#f3f4f6;color:#111827;font-size:11px;font-weight:900;">${safeDriverRating} ★</span>${safeDriverTrips ? `<div style="margin-top:4px;color:#9ca3af;font-size:8px;">${safeDriverTrips} evaluations</div>` : ""}</td>
                </tr></table>
              </div>

              <div style="padding:18px 0;color:#6b7280;font-size:10px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td>ID voyage</td><td style="font-weight:800;text-align:right;word-break:break-all;">${safeTripId}</td></tr></table>
              </div>

              <div style="margin-bottom:24px;padding:17px;border-radius:14px;background:#f0fdf4;color:#3f4f45;font-size:11px;line-height:1.5;">
                Votre trajet est protege par BeGO. Le recu officiel est aussi joint en PDF pour vos archives.
              </div>

              <div style="padding:0 0 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td width="49%" valign="top" style="padding:15px;border:1px solid #e5e7eb;border-radius:12px;">
                    <div style="font-size:12px;font-weight:900;">Besoin d'aide ?</div>
                    <div style="margin-top:6px;color:#6b7280;font-size:9px;line-height:1.5;">Notre equipe peut vous aider concernant ce trajet.</div>
                    <a href="https://bego.com.ht/#/ayuda" style="display:inline-block;margin-top:10px;color:#111827;font-size:9px;font-weight:900;">Contacter le support →</a>
                  </td>
                  <td width="2%"></td>
                  <td width="49%" valign="top" style="padding:15px;border:1px solid #e5e7eb;border-radius:12px;">
                    <div style="font-size:12px;font-weight:900;">Objet oublie ?</div>
                    <div style="margin-top:6px;color:#6b7280;font-size:9px;line-height:1.5;">Signalez un objet perdu apres votre course.</div>
                    <a href="https://bego.com.ht/#/soporte" style="display:inline-block;margin-top:10px;color:#111827;font-size:9px;font-weight:900;">Signaler un objet →</a>
                  </td>
                </tr></table>
                <div style="margin-top:14px;text-align:right;"><a href="https://bego.com.ht/#/actividad" style="color:#111827;font-size:9px;font-weight:900;">Voir l'historique de vos trajets →</a></div>
              </div>

              <div style="padding:20px;border-radius:14px 14px 0 0;background:#111827;color:#ffffff;text-align:center;">
                <div style="font-size:14px;font-weight:900;margin-bottom:10px;">Suivez BeGO Haiti</div>
                <div>${renderSocialLinks()}</div>
              </div>
            </div>

            <div style="padding:20px 28px;background:#050505;color:#9ca3af;font-size:10px;line-height:1.7;text-align:center;">
              BeGO Haiti · Recu genere automatiquement · Paiement ${escapeHtml(estadoPago || "confirme")}<br>
              <a href="https://bego.com.ht/#/legal-confianza" style="color:#d1d5db;text-decoration:underline;">Confidentialite</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://bego.com.ht/#/legal" style="color:#d1d5db;text-decoration:underline;">Conditions</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://bego.com.ht/#/ayuda" style="color:#d1d5db;text-decoration:underline;">Aide</a>
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
        {
          filename: `Trajet_BeGO_${viajeId}.png`,
          content: mapBuffer,
          contentType: "image/png",
          cid: "bego-route-map",
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

async function enviarCodigoVerificacionEmail({
  to,
  code,
  rol = "pasajero",
  purpose = "register",
  idempotencyKey,
}) {
  if (!to) throw new Error("Destino requerido");
  if (!emailIsConfigured()) throw new Error(missingConfigMessage());

  const perfil = rol === "motorista" ? "chauffeur" : "passager";
  const isPasswordReset = purpose === "password_reset";
  const subject = isPasswordReset
    ? "Votre code pour modifier le mot de passe BeGO"
    : "Votre code de verification BeGO";
  const heading = isPasswordReset
    ? "Securite du compte"
    : `Verification de compte ${perfil}`;
  const instruction = isPasswordReset
    ? "Utilisez ce code pour definir un nouveau mot de passe BeGO."
    : "Utilisez ce code pour terminer votre inscription BeGO.";
  const ignoredAction = isPasswordReset
    ? "cette modification de mot de passe"
    : "cette inscription";

  return sendEmail({
    to,
    subject,
    html: `
      <div style="display:none;max-height:0;overflow:hidden;color:transparent;">Votre code BeGO est ${escapeHtml(code)}. Il expire dans 10 minutes.</div>
      <div style="background:#f5f7fb;margin:0;padding:12px 8px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:20px;overflow:hidden;box-shadow:0 12px 28px rgba(15,23,42,.10);">
          <div style="background:#07111f;padding:24px 20px;border-bottom:5px solid #2563eb;">
            <div style="font-size:32px;line-height:1;font-weight:900;color:#ffffff;">BeGO</div>
            <div style="margin-top:10px;color:#93c5fd;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(heading)}</div>
            <div style="margin-top:14px;color:#cbd5e1;font-size:14px;line-height:1.55;">${escapeHtml(instruction)}</div>
          </div>
          <div style="padding:24px 20px;">
            <div style="background:#eef5ff;border:1px solid #bfdbfe;border-radius:18px;padding:20px;text-align:center;">
              <div style="color:#2563eb;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">Code de verification</div>
              <div style="margin-top:12px;color:#0f172a;font-size:40px;line-height:1;font-weight:900;letter-spacing:.16em;">${escapeHtml(code)}</div>
              <div style="margin-top:14px;color:#475569;font-size:13px;">Ce code expire dans 10 minutes.</div>
            </div>
            <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.55;">Si vous n'avez pas demande ${escapeHtml(ignoredAction)}, ignorez cet email.</p>
          </div>
          <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 20px;text-align:center;color:#64748b;font-size:12px;line-height:1.5;">
            BeGO Haiti
          </div>
        </div>
      </div>
    `,
    idempotencyKey,
  });
}

async function enviarAlertaMonitoreo({ to, subject, html, idempotencyKey }) {
  if (!to) throw new Error("Destino requerido");
  if (!emailIsConfigured()) throw new Error(missingConfigMessage());

  return sendEmail({
    to,
    subject,
    html,
    idempotencyKey,
  });
}

module.exports = {
  enviarCodigoVerificacionEmail,
  getResendDomainStatus,
  enviarResumenViaje,
  enviarEmailPrueba,
  enviarAlertaMonitoreo,
  verificarConexionEmail,
};
