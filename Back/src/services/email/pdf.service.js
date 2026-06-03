const PDFDocument = require("pdfkit");

const SOCIAL_LINKS = [
  { label: "Facebook", value: "BeGO Haiti", url: "facebook.com/search/top?q=bego%20haiti" },
  { label: "Instagram", value: "@bego.haiti", url: "instagram.com/bego.haiti" },
  { label: "TikTok", value: "@bego.ht", url: "tiktok.com/@bego.ht" },
];

function money(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("fr-HT")} HTG`;
}

function text(value, fallback = "No especificado") {
  return String(value || fallback);
}

function paymentLabel(value) {
  const method = String(value || "").toLowerCase();
  const labels = {
    efectivo: "Especes",
    wallet: "Wallet BeGO",
    moncash: "MonCash",
    natcash: "NatCash",
  };
  return labels[method] || text(value, "Especes");
}

function shortId(value) {
  const id = text(value, "N/A");
  return id.length > 12 ? `${id.slice(0, 6)}...${id.slice(-6)}` : id;
}

function drawCard(doc, x, y, width, height, fill = "#ffffff", stroke = "#e2e8f0", radius = 18) {
  doc.save();
  doc.roundedRect(x, y, width, height, radius).fillAndStroke(fill, stroke);
  doc.restore();
}

function drawLabelValue(doc, label, value, x, y, width, options = {}) {
  doc
    .font("Helvetica")
    .fontSize(options.labelSize || 8)
    .fillColor(options.labelColor || "#64748b")
    .text(label.toUpperCase(), x, y, { width, characterSpacing: 0.4 });

  doc
    .font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.valueSize || 11)
    .fillColor(options.valueColor || "#0f172a")
    .text(text(value), x, y + 14, { width, height: options.height || 34 });
}

function drawPill(doc, label, x, y, width) {
  doc.save();
  doc.roundedRect(x, y, width, 26, 13).fill("#eff6ff");
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#2563eb").text(label, x, y + 8, {
    width,
    align: "center",
  });
  doc.restore();
}

function generarPdfRecibo(datos) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 42;
    const contentWidth = pageWidth - margin * 2;
    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString("fr-HT", { year: "numeric", month: "2-digit", day: "2-digit" });
    const horaTexto = fecha.toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit" });
    const tripId = text(datos.viajeId, "N/A");

    doc.rect(0, 0, pageWidth, pageHeight).fill("#f6f8fb");

    drawCard(doc, 28, 28, pageWidth - 56, 154, "#07111f", "#07111f", 24);
    doc.rect(28, 150, pageWidth - 56, 32).fill("#2563eb");
    doc
      .font("Helvetica-Bold")
      .fontSize(31)
      .fillColor("#ffffff")
      .text("BeGO", margin, 58, { width: 180 });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#93c5fd")
      .text("Recu officiel de course", margin, 96, { characterSpacing: 0.5 });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#cbd5e1")
      .text("Merci d'avoir choisi une course BeGO.", margin, 116, { width: 240 });

    drawPill(doc, "COURSE TERMINEE", pageWidth - margin - 132, 58, 132);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#cbd5e1")
      .text("REFERENCE", pageWidth - margin - 170, 102, { width: 170, align: "right" });
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#ffffff")
      .text(shortId(tripId), pageWidth - margin - 170, 116, { width: 170, align: "right" });

    drawCard(doc, margin, 210, contentWidth, 112, "#ffffff", "#e5edf8", 20);
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text("Montant paye", margin + 22, 236);
    doc.font("Helvetica-Bold").fontSize(31).fillColor("#0f172a").text(money(datos.total), margin + 22, 254);
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(`${fechaTexto}  ${horaTexto}`, margin + 22, 292);
    drawLabelValue(doc, "Paiement", paymentLabel(datos.metodoPago), pageWidth - margin - 150, 239, 128, {
      bold: true,
      valueSize: 13,
      valueColor: "#2563eb",
    });

    drawCard(doc, margin, 348, contentWidth, 118, "#ffffff", "#e5edf8", 18);
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a").text("Details du service", margin + 22, 372);
    drawLabelValue(doc, "Passager", text(datos.nombrePasajero, "Passager"), margin + 22, 404, 145, { bold: true });
    drawLabelValue(doc, "Conducteur", text(datos.nombreConductor, "Socio BeGO"), margin + 190, 404, 145, { bold: true });
    drawLabelValue(doc, "Distance", `${text(datos.distanciaKm, "0")} km`, margin + 358, 404, 74, { bold: true });
    drawLabelValue(doc, "Duree", `${text(datos.tiempo, "0")} min`, margin + 442, 404, 68, { bold: true });

    drawCard(doc, margin, 492, contentWidth, 154, "#ffffff", "#e5edf8", 18);
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a").text("Itineraire", margin + 22, 516);
    doc.save();
    doc.circle(margin + 31, 560, 5).fill("#2563eb");
    doc.moveTo(margin + 31, 568).lineTo(margin + 31, 597).lineWidth(1.5).strokeColor("#bfdbfe").stroke();
    doc.circle(margin + 31, 606, 5).fill("#0f172a");
    doc.restore();
    drawLabelValue(doc, "Depart", text(datos.origen), margin + 54, 548, contentWidth - 78, { height: 34 });
    drawLabelValue(doc, "Destination", text(datos.destino), margin + 54, 594, contentWidth - 78, { height: 34 });

    drawCard(doc, margin, 672, contentWidth, 86, "#eef5ff", "#dbeafe", 18);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#0f172a")
      .text("Suivez BeGO Haiti", margin + 22, 694);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#475569")
      .text("Offres, securite et nouveautes disponibles sur nos reseaux officiels.", margin + 22, 714, {
        width: 240,
      });

    SOCIAL_LINKS.forEach((item, index) => {
      const x = margin + 310 + index * 66;
      doc.save();
      doc.roundedRect(x, 699, 54, 36, 10).fill("#ffffff");
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#2563eb").text(item.label, x + 5, 706, {
        width: 44,
        align: "center",
      });
      doc.font("Helvetica").fontSize(6.5).fillColor("#0f172a").text(item.value, x + 5, 719, {
        width: 44,
        align: "center",
      });
      doc.restore();
    });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#64748b")
      .text(`ID voyage complet: ${tripId}`, margin, 788, { width: contentWidth, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(
        "BeGO Haiti - Recu genere automatiquement par la plateforme. Conservez ce document pour votre suivi.",
        margin,
        804,
        { width: contentWidth, align: "center" }
      );

    doc.end();
  });
}

module.exports = { generarPdfRecibo };
