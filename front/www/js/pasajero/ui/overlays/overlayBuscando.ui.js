export function ocultarOverlayBuscando() {
    const overlay = document.getElementById("overlayBuscando");
    if (overlay) {
        overlay.style.display = "none";
    }
    
    const footer = document.querySelector("footer");
    if (footer) footer.classList.remove("buscando");

    viajeState.buscando = false;
    actualizarBotonViaje();
}