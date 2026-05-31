export function initReciboRecarga() {

  const recibo = JSON.parse(localStorage.getItem("reciboRecarga"));

  if (!recibo) {
    location.hash = "#/";
    return;
  }

  document.getElementById("numero").textContent = recibo.numero;
  document.getElementById("operadora").textContent = recibo.operadora.toUpperCase();
  document.getElementById("monto").textContent = `HTG ${recibo.monto}`;
  document.getElementById("fecha").textContent = new Date(recibo.fecha).toLocaleString();
  document.getElementById("estado").textContent = recibo.estado || "completada";
  document.getElementById("firmaBeGO").textContent = recibo.firmaBeGO;

  // =========================
  // PDF
  // =========================
  document.getElementById("btnDescargar").addEventListener("click", async () => {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(2, 6, 23);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(255,255,255);
    doc.setFontSize(22);
    doc.text("BeGO - Recibo de Recarga", 20, 30);

    doc.setFontSize(14);
    doc.text(`Número: ${recibo.numero}`, 20, 50);
    doc.text(`Operadora: ${recibo.operadora.toUpperCase()}`, 20, 60);
    doc.text(`Monto: HTG ${recibo.monto}`, 20, 70);
    doc.text(`Fecha: ${new Date(recibo.fecha).toLocaleString()}`, 20, 80);
    doc.text(`Estado: ${recibo.estado || "completada"}`, 20, 90);

    doc.setTextColor(34,197,94);
    doc.text(`Firma: ${recibo.firmaBeGO}`, 20, 110);

    doc.setTextColor(156,163,175);
    doc.setFontSize(10);
    doc.text("Documento oficial BeGO", 20, 280);

    doc.save(`Recibo_${recibo.numero}.pdf`);
  });

  // =========================
  // SPA NAV
  // =========================
  document.getElementById("btnHome").addEventListener("click", () => {
    location.hash = "#/";
  });

}