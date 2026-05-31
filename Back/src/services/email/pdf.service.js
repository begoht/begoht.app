const PDFDocument = require('pdfkit');

/**
 * Genera un buffer de PDF con el recibo del viaje (Estilo Premium BeGO)
 */
const generarPdfRecibo = (datos) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        let buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- DISEÑO ---
        const primaryColor = '#2563eb';
        const darkColor = '#0f172a';

        // Rectángulo decorativo superior
        doc.rect(0, 0, 612, 100).fill(darkColor);

        // Logo y Título
        doc.fillColor('#ffffff').fontSize(26).text('BeGO', 50, 40, { characterSpacing: 1 });
        doc.fontSize(10).fillColor('#38bdf8').text('RECIBO DE VIAJE', 50, 70);

        // Datos de cabecera
        doc.fillColor('#ffffff').fontSize(9).text(`ID: ${datos.viajeId}`, 400, 45, { align: 'right' });
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 400, 60, { align: 'right' });

        doc.moveDown(5);

        // --- CUERPO ---
        doc.fillColor('#000000').fontSize(14).text('Resumen de Pago', { underline: true }).moveDown(1);
        
        // Fila de Total
        doc.fontSize(22).fillColor(primaryColor).text(`ARS ${datos.total}`, { align: 'right' });
        doc.fontSize(10).fillColor('#64748b').text('Monto total cargado', { align: 'right' }).moveDown(2);

        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke().moveDown(1);

        // Detalles del Servicio
        doc.fillColor('#0f172a').fontSize(12).text('Detalles del servicio');
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#475569');
        doc.text(`Pasajero: ${datos.nombrePasajero}`);
        doc.text(`Conductor: ${datos.nombreConductor || 'Socio BeGO'}`);
        doc.text(`Distancia recorrida: ${datos.distanciaKm} km`);
        doc.text(`Tiempo de viaje: ${datos.tiempo} min`);
        doc.text(`Método de pago: ${datos.metodoPago || 'Efectivo'}`).moveDown(2);

        // Bloque de Ruta
        doc.rect(50, doc.y, 500, 70).fill('#f8fafc');
        doc.fillColor(primaryColor).fontSize(8).text('ORIGEN', 65, doc.y - 60);
        doc.fillColor('#1e293b').fontSize(10).text(datos.origen || 'No especificado', 65, doc.y - 50);
        
        doc.fillColor(primaryColor).fontSize(8).text('DESTINO', 65, doc.y - 25);
        doc.fillColor('#1e293b').fontSize(10).text(datos.destino || 'No especificado', 65, doc.y - 15);

        // Pie de página
        doc.fontSize(8).fillColor('#94a3b8').text(
            'BeGO B.V. - Este documento es un comprobante de servicio realizado a través de nuestra plataforma tecnológica.',
            50, 780, { align: 'center' }
        );

        doc.end();
    });
};

module.exports = { generarPdfRecibo };