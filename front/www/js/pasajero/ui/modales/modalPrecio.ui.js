/*************************************************
 * 💰 MODAL CONFIRMAR VIAJE (PREMIUM)
 *************************************************/
export function mostrarModalPrecio({ precio, distanciaKm, metodoPago, onConfirm, onCancel }) {
    cerrarModalPrecio();

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
            <h3 style="margin-bottom:10px;">Confirmar viaje</h3>

            <div style="margin:10px 0; font-size:14px; color:#94a3b8;">
                📏 ${distanciaKm} km<br>
                💳 ${metodoPago.toUpperCase()}
            </div>

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
                    Confirmar
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