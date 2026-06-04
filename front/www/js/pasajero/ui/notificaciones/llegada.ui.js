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

export function mostrarNotificacionProximidad(data = {}) {
    const existente = document.getElementById("toastProximidadMotorista");
    if (existente) existente.remove();

    const metros = Number(data.metros);
    const distancia = Number.isFinite(metros) && metros > 0
        ? metros < 1000
            ? `${Math.round(metros)} m`
            : `${(metros / 1000).toFixed(1)} km`
        : "muy cerca";
    const eta = data.eta ? ` | ${data.eta} min` : "";

    const toast = document.createElement("div");
    toast.id = "toastProximidadMotorista";

    toast.innerHTML = `
        <div style="
            position: fixed;
            bottom: calc(22px + env(safe-area-inset-bottom, 0px));
            left: 50%;
            width: min(calc(100vw - 28px), 380px);
            transform: translateX(-50%) translateY(18px);
            color: #f8fafc;
            padding: 14px;
            border-radius: 20px;
            background:
                radial-gradient(circle at 20% 0%, rgba(96,165,250,.36), transparent 34%),
                linear-gradient(135deg, #0f172a, #2563eb);
            box-shadow: 0 22px 48px rgba(15,23,42,.28);
            z-index: 9999;
            opacity: 0;
            transition: all 0.32s ease;
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr);
            gap: 12px;
            align-items: center;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
            <span style="
                display:grid;
                place-items:center;
                width:42px;
                height:42px;
                border-radius:16px;
                color:#172554;
                background:#dbeafe;
                font-size:18px;
                font-weight:900;
            ">✓</span>
            <span style="min-width:0;">
                <strong style="display:block;font-size:15px;line-height:1.2;">Motorista a punto de llegar</strong>
                <span style="display:block;margin-top:3px;color:rgba(248,250,252,.78);font-size:12px;line-height:1.35;">
                    Esta a ${distancia}${eta}. Preparate para salir.
                </span>
            </span>
        </div>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.firstElementChild.style.opacity = "1";
        toast.firstElementChild.style.transform = "translateX(-50%) translateY(0)";
    });

    setTimeout(() => {
        if (!toast.firstElementChild) return;
        toast.firstElementChild.style.opacity = "0";
        toast.firstElementChild.style.transform = "translateX(-50%) translateY(18px)";
        setTimeout(() => toast.remove(), 320);
    }, 7000);
}

export function actualizarEstadoProximidad(data = {}) {
    const box = document.getElementById("estadoViaje");
    if (!box) return;

    const metros = Number(data.metros);
    const distancia = Number.isFinite(metros) && metros > 0
        ? `${Math.round(metros)} m`
        : "muy cerca";

    box.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;color:#2563eb;font-weight:700;">
            <span style="font-size:18px;">✓</span>
            <span style="min-width:0;line-height:1.25;overflow-wrap:anywhere;">El motorista esta a punto de llegar (${distancia})</span>
        </div>
    `;
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
