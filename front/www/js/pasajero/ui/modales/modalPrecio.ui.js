/*************************************************
 * MODAL CONFIRMAR VIAJE (PREMIUM)
 *************************************************/
export function mostrarModalPrecio({ precio, distanciaKm, metodoPago, tipo = "viaje", paquete = null, onConfirm, onCancel }) {
    cerrarModalPrecio();

    const esEnvio = tipo === "envio";
    const peso = Number(paquete?.pesoKg || 0);
    const paqueteHtml = esEnvio && paquete ? `
            <div style="margin:12px 0; padding:12px; border-radius:14px; background:rgba(14,165,233,0.1); border:1px solid rgba(56,189,248,0.18); color:#e0f2fe; font-size:13px; line-height:1.45;">
                <strong style="display:block; color:#7dd3fc; margin-bottom:4px;">Envio de paquete</strong>
                Peso: ${Number.isFinite(peso) ? peso.toFixed(1) : "0.0"} kg<br>
                ${paquete.descripcion ? `Detalle: ${paquete.descripcion}<br>` : ""}
                <span style="color:#94a3b8;">El codigo de 4 digitos se genera al confirmar.</span>
            </div>
    ` : "";

    const modal = document.createElement("div");
    modal.id = "modalPrecio";

    modal.innerHTML = `
    <div style="
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.25s ease;
    ">
        <div style="
            background: #0f172a;
            color: white;
            border-radius: 20px;
            padding: 20px;
            width: 90%;
            max-width: 350px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            animation: scaleIn 0.25s ease;
            font-family: system-ui;
        ">
            <h3 style="margin-bottom:10px;">Confirmar ${esEnvio ? "envio" : "viaje"}</h3>

            <div style="margin:10px 0; font-size:14px; color:#94a3b8;">
                Distancia: ${distanciaKm} km<br>
                Pago: ${String(metodoPago || "").toUpperCase()}
            </div>

            ${paqueteHtml}

            <div style="
                font-size:28px;
                font-weight:bold;
                color:#22c55e;
                margin:10px 0;
            ">
                ${precio} G
            </div>

            <div style="display:flex; gap:10px; margin-top:15px;">
                <button id="btnCancelarPrecio" style="
                    flex:1;
                    padding:10px;
                    border:none;
                    border-radius:10px;
                    background:#334155;
                    color:white;
                    cursor:pointer;
                ">
                    Cancelar
                </button>

                <button id="btnConfirmarPrecio" style="
                    flex:1;
                    padding:10px;
                    border:none;
                    border-radius:10px;
                    background:#22c55e;
                    color:white;
                    font-weight:bold;
                    cursor:pointer;
                ">
                    ${esEnvio ? "Confirmar envio" : "Confirmar"}
                </button>
            </div>
        </div>
    </div>

    <style>
    @keyframes fadeIn { from {opacity:0} to {opacity:1} }
    @keyframes scaleIn { from {transform:scale(.9)} to {transform:scale(1)} }
    </style>
    `;

    document.body.appendChild(modal);

    document.getElementById("btnConfirmarPrecio").onclick = () => {
        onConfirm();
        cerrarModalPrecio();
    };

    document.getElementById("btnCancelarPrecio").onclick = () => {
        onCancel();
        cerrarModalPrecio();
    };
}

export function cerrarModalPrecio() {
    const modal = document.getElementById("modalPrecio");
    if (modal) modal.remove();
}
