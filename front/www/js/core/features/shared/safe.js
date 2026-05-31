export function safe(fn) {
    try {
        fn?.();
    } catch (e) {
        console.warn("⚠️ Error en init:", e);
    }
}