/*************************************************
 * 🚖 LLEGADA MOTORISTA (UI PREMIUM)
 *************************************************/
export function mostrarNotificacionLlegada(data) {
    const existente = document.getElementById("toastLlegada");
    if (existente) existente.remove();

    const toast = document.createElement("div");
    toast.id = "toastLlegada";

    toast.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: linear-gradient(135deg, #16a34a, #22c55e);
            color: white;
            padding: 14px 18px;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 10px 30px rgba(0,0,0,0.35);
            z-index: 9999;
            opacity: 0;
            transition: all 0.35s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        ">
            <span style="font-size:18px;">🚖</span>
            <span>${data?.mensaje || "Tu motorista ha llegado"}</span>
        </div>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.firstElementChild.style.opacity = "1";
        toast.firstElementChild.style.transform = "translateX(-50%) translateY(0)";
    });

    setTimeout(() => {
        toast.firstElementChild.style.opacity = "0";
        toast.firstElementChild.style.transform = "translateX(-50%) translateY(20px)";
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

export function actualizarEstadoLlegada() {
    const box = document.getElementById("estadoViaje");
    if (!box) return;

    box.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;color:#4ade80;font-weight:600;">
            <span style="font-size:18px;">🟢</span>
            <span>El motorista está afuera</span>
        </div>
    `;
}

export function reproducirSonidoLlegada() {
    const sonido = document.getElementById("sonidoLlegada");
    if (!sonido) return;

    sonido.currentTime = 0;
    sonido.play().catch(() => {});
}