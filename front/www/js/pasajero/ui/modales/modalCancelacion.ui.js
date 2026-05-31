export function mostrarModalConfirmarCancelacion(onConfirm) {
    const modal = document.createElement("div");

    modal.innerHTML = `
    <div style="
        position:fixed; inset:0;
        background:rgba(0,0,0,0.6);
        display:flex; align-items:center; justify-content:center;
        z-index:9999;
    ">
        <div style="
            background:#0f172a;
            padding:20px;
            border-radius:16px;
            width:90%; max-width:300px;
            color:white;
            text-align:center;
        ">
            <p style="margin-bottom:15px;">¿Cancelar viaje?</p>

            <div style="display:flex; gap:10px;">
                <button id="noCancel" style="flex:1;">No</button>
                <button id="yesCancel" style="flex:1; background:#ef4444; color:white;">Sí</button>
            </div>
        </div>
    </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#yesCancel").onclick = () => {
        onConfirm();
        modal.remove();
    };

    modal.querySelector("#noCancel").onclick = () => {
        modal.remove();
    };
}