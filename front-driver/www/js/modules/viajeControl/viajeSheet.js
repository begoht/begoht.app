let sheetDragInicializado = false;

export function inicializarSheetExpandible() {
    if (sheetDragInicializado) return;
    const panel = document.getElementById("panelViajeControl");
    const handle = document.getElementById("viajeSheetHandle");
    if (!panel || !handle) return;

    sheetDragInicializado = true;
    let startY = 0;
    let startHeight = 0;
    let dragging = false;
    let movedByDrag = false;
    const snapPoints = [
        { size: "compact", ratio: 0.25 },
        { size: "medium", ratio: 0.5 },
        { size: "full", ratio: 1 }
    ];

    const setSize = size => {
        panel.style.height = "";
        panel.style.maxHeight = "";
        panel.classList.remove("is-dragging");
        panel.dataset.sheetSize = size;
        handle.setAttribute("aria-expanded", size === "full" ? "true" : "false");
    };

    const getViewportHeight = () => Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0, 1);

    const clampHeight = height => {
        const viewportHeight = getViewportHeight();
        return Math.min(viewportHeight, Math.max(viewportHeight * 0.25, height));
    };

    const nearestSnapSize = height => {
        const viewportHeight = getViewportHeight();
        return snapPoints.reduce((closest, point) => {
            const distance = Math.abs(height - viewportHeight * point.ratio);
            return distance < closest.distance ? { size: point.size, distance } : closest;
        }, { size: "medium", distance: Infinity }).size;
    };

    const nextSnapSize = () => {
        const current = panel.dataset.sheetSize || "medium";
        if (current === "compact") return "medium";
        if (current === "medium") return "full";
        return "compact";
    };

    handle.addEventListener("click", () => {
        if (movedByDrag) {
            movedByDrag = false;
            return;
        }
        setSize(nextSnapSize());
    });

    handle.addEventListener("pointerdown", event => {
        dragging = true;
        movedByDrag = false;
        startY = event.clientY;
        startHeight = panel.getBoundingClientRect().height || getViewportHeight() * 0.5;
        panel.classList.add("is-dragging");
        handle.setPointerCapture?.(event.pointerId);
    });

    handle.addEventListener("pointermove", event => {
        if (!dragging) return;
        const delta = event.clientY - startY;
        const nextHeight = clampHeight(startHeight - delta);
        if (Math.abs(delta) > 6) movedByDrag = true;
        panel.style.height = `${Math.round(nextHeight)}px`;
        panel.style.maxHeight = "100dvh";
    });

    handle.addEventListener("pointerup", event => {
        if (!dragging) return;
        dragging = false;
        const delta = event.clientY - startY;
        const nextHeight = clampHeight(startHeight - delta);
        if (Math.abs(delta) > 6) {
            movedByDrag = true;
            setSize(nearestSnapSize(nextHeight));
        } else {
            panel.style.height = "";
            panel.style.maxHeight = "";
            panel.classList.remove("is-dragging");
        }
        handle.releasePointerCapture?.(event.pointerId);
    });

    handle.addEventListener("pointercancel", () => {
        dragging = false;
        panel.style.height = "";
        panel.style.maxHeight = "";
        panel.classList.remove("is-dragging");
    });
}

export function mostrarPanelViaje(panel) {
    if (!panel) return;
    if (panel.classList.contains("hidden")) panel.classList.remove("hidden");
    if (panel.style.display !== "flex") panel.style.display = "flex";
}

export function ocultarPanelViaje(panel) {
    if (!panel) return;
    if (!panel.classList.contains("hidden")) panel.classList.add("hidden");
    if (panel.style.display !== "none") panel.style.display = "none";
}
