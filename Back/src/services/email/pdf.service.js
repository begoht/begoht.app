const PDFDocument = require("pdfkit");

function money(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("fr-HT")} HTG`;
}

function text(value, fallback = "No especificado") {
  return String(value || fallback);
}

function generarPdfRecibo(datos) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const primaryColor = "#2563eb";
    const darkColor = "#0f172a";

    doc.rect(0, 0, 612, 100).fill(darkColor);
    doc.fillColor("#ffffff").fontSize(26).text("BeGO", 50, 40, { characterSpacing: 1 });
    doc.fontSize(10).fillColor("#38bdf8").text("RECIBO DE VIAJE", 50, 70);
    doc.fillColor("#ffffff").fontSize(9).text(`ID: ${datos.viajeId}`, 400, 45, { align: "right" });
    doc.text(`Fecha: ${new Date().toLocaleDateString("fr-HT")}`, 400, 60, { align: "right" });

    doc.moveDown(5);
    doc.fillColor("#000000").fontSize(14).text("Resumen de Pago", { underline: true }).moveDown(1);
    doc.fontSize(22).fillColor(primaryColor).text(money(datos.total), { align: "right" });
    doc.fontSize(10).fillColor("#64748b").text("Monto total cargado", { align: "right" }).moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#e2e8f0").stroke().moveDown(1);

    doc.fillColor("#0f172a").fontSize(12).text("Detalles del servicio");
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#475569");
    doc.text(`Pasajero: ${text(datos.nombrePasajero, "Pasajero")}`);
    doc.text(`Conductor: ${text(datos.nombreConductor, "Socio BeGO")}`);
    doc.text(`Distancia recorrida: ${text(datos.distanciaKm, "0")} km`);
    doc.text(`Tiempo de viaje: ${text(datos.tiempo, "0")} min`);
    doc.text(`Metodo de pago: ${text(datos.metodoPago, "Efectivo")}`).moveDown(2);

    doc.rect(50, doc.y, 500, 70).fill("#f8fafc");
    doc.fillColor(primaryColor).fontSize(8).text("ORIGEN", 65, doc.y - 60);
    doc.fillColor("#1e293b").fontSize(10).text(text(datos.origen), 65, doc.y - 50, { width: 455 });
    doc.fillColor(primaryColor).fontSize(8).text("DESTINO", 65, doc.y - 25);
    doc.fillColor("#1e293b").fontSize(10).text(text(datos.destino), 65, doc.y - 15, { width: 455 });

    doc.fontSize(8).fillColor("#94a3b8").text(
      "BeGO Haiti - Este documento es un comprobante de servicio realizado a traves de nuestra plataforma tecnologica.",
      50,
      780,
      { align: "center" }
    );

    doc.end();
  });
}

module.exports = { generarPdfRecibo };
