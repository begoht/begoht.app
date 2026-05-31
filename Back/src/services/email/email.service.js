const nodemailer = require("nodemailer");
const EmailLog = require("../../models/EmailLog");
const { generarPdfRecibo } = require("./pdf.service"); 

// Configuración para Gmail
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

/**
 * 🔍 VERIFICACIÓN DE CONEXIÓN
 */
transporter.verify((error) => {
    if (error) {
        console.log("❌ Error de configuración de Email:", error.message);
    } else {
        console.log("✅ Servidor de correos BeGO listo");
    }
});

/**
 * Envía el resumen de viaje con estilo inspirado en BeGO App + Adjunto PDF
 */
const enviarResumenViaje = async (datos) => {
    const { 
        email, nombrePasajero, viajeId, pasajeroId, 
        distanciaKm, tiempo, total, origen, destino, 
        nombreConductor, metodoPago 
    } = datos;

    if (!email) {
        console.log("⚠️ Intento de envío fallido: Falta el email.");
        return false;
    }

    const fechaActual = new Date().toLocaleDateString('es-AR');
    const horaActual = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    try {
        // --- 1. GENERAR EL PDF USANDO EL SERVICIO SEPARADO ---
        const pdfBuffer = await generarPdfRecibo(datos);

        // --- 2. CONFIGURAR EL CORREO ---
        const mailOptions = {
            from: `"BeGO Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Gracias por usar BeGO, ${nombrePasajero}`,
            html: `
            <div style="background-color: #0f172a; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 0; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden;">
                <div style="background-color: #020617; padding: 40px 40px 20px 40px; border-bottom: 1px solid #2563eb;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">BeGO</h1>
                </div>
                
                <div style="padding: 40px;">
                    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 10px;">${fechaActual}, ${horaActual}</p>
                    <h2 style="font-size: 32px; line-height: 38px; margin: 0 0 20px 0; font-weight: bold; color: #ffffff;">Gracias por viajar, ${nombrePasajero}</h2>
                    <p style="font-size: 15px; color: #e5e7eb; margin-bottom: 40px;">Esperamos que hayas disfrutado tu viaje en BeGO. Adjuntamos tu recibo oficial en este correo.</p>

                    <div style="border-top: 1px solid #1e293b; margin-bottom: 30px;"></div>

                    <table width="100%" style="margin-bottom: 30px; background: rgba(37, 99, 235, 0.1); padding: 20px; border-radius: 15px;">
                        <tr>
                            <td style="font-size: 20px; font-weight: bold; color: #94a3b8;">Total</td>
                            <td style="font-size: 28px; font-weight: bold; text-align: right; color: #38bdf8;">${total} HTG</td>
                        </tr>
                    </table>

                    <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #ffffff;">Detalles del Pago</h3>
                    <table width="100%" style="margin-bottom: 30px;">
                        <tr>
                            <td style="font-size: 14px; color: #e5e7eb;">
                                <strong>${metodoPago || 'Efectivo'}</strong><br>
                                <span style="color: #94a3b8; font-size: 12px;">Completado el ${fechaActual}</span>
                            </td>
                            <td style="text-align: right; font-size: 14px; color: #ffffff; vertical-align: top;">${total} HTG</td>
                        </tr>
                    </table>

                    <div style="border-top: 1px solid #1e293b; margin-bottom: 30px;"></div>

                    <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #ffffff;">Resumen de Ruta</h3>
                    <div style="margin-bottom: 30px;">
                        <p style="margin: 0; font-size: 15px; font-weight: bold; color: #38bdf8;">Essential 🛵</p>
                        <p style="margin: 4px 0 20px 0; color: #94a3b8; font-size: 13px;">${distanciaKm} km | ${tiempo} min</p>
                        
                        <div style="border-left: 2px solid #2563eb; padding-left: 20px; margin-left: 5px;">
                            <p style="font-size: 13px; margin: 0 0 15px 0;">
                                <strong style="color: #ffffff;">Origen:</strong><br>
                                <span style="color: #94a3b8;">${origen || 'No especificado'}</span>
                            </p>
                            <p style="font-size: 13px; margin: 0;">
                                <strong style="color: #ffffff;">Destino:</strong><br>
                                <span style="color: #94a3b8;">${destino || 'No especificado'}</span>
                            </p>
                        </div>
                    </div>

                    <div style="background-color: #020617; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px; border: 1px solid #1e293b;">
                        <p style="margin: 0; font-size: 14px; color: #e5e7eb;">Viajaste con <strong>${nombreConductor || 'Socio BeGO'}</strong></p>
                    </div>
                </div>

                <div style="background-color: #020617; padding: 40px; border-top: 1px solid #1e293b; text-align: left;">
                    <p style="font-size: 11px; color: #94a3b8; line-height: 18px;">
                        BeGO Argentina<br>
                        Córdoba, Argentina<br>
                        ID de Viaje: ${viajeId}
                    </p>
                </div>
            </div>
            `,
            attachments: [
                {
                    filename: `Recibo_BeGO_${viajeId}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        // --- 3. ENVIAR Y LOGUEAR ---
        const info = await transporter.sendMail(mailOptions);

        await EmailLog.create({
            viajeId, pasajeroId, email,
            mensajeId: info.messageId,
            estado: 'enviado',
            fecha: new Date()
        });

        console.log(`📧 Email y PDF enviados con éxito a: ${email}`);
        return true;

    } catch (error) {
        console.error("❌ Error en email.service:", error.message);
        try {
            await EmailLog.create({
                viajeId, pasajeroId, email,
                estado: 'error',
                error: error.message,
                fecha: new Date()
            });
        } catch (logError) {
            console.error("Error guardando el log de error:", logError.message);
        }
        return false;
    }
};

module.exports = { enviarResumenViaje };