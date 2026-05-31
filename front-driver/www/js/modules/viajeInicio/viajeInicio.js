import { 
    getEstadoViaje, setEstadoViaje, 
    getViajeEnCursoId, setViajeEnCurso, 
    viajesActivos 
} from "../viajeControl/viajeEstado.js"; 
import { reconstruirUIDesdeEstado } from "../viajeControl/viajeUI.js";
import { getUltimaPosicion } from "../gps.js";
import { dibujarRutaPremium } from "../map.js";
import { UI_REFS, llegadaTimeout } from "./viajeInicioEstado.js";
import { limpiarInterfazViaje, redibujarRutaRecovery } from "./viajeInicioUI.js";
import { initViajeRecovery } from "./viajeRecovery.js";

export function initViajeInicio(socket, detenerSimulacionETA) {
    if (!socket) return console.error("Socket no disponible en ViajeInicio");
    
    // 1. Cache UI
    UI_REFS.btnIniciar = document.getElementById("btnIniciarViaje");
    UI_REFS.btnFinalizar = document.getElementById("btnFinalizar");
    UI_REFS.btnLlegue = document.getElementById("btnLlegue");
    UI_REFS.estadoBox = document.getElementById("estadoViaje");
    UI_REFS.panelControl = document.getElementById("panelViajeControl");
    
    if (!UI_REFS.btnIniciar) return;

    // Inicializar el módulo de recuperación (escucha sync-viaje)
    initViajeRecovery(socket);

    ["viaje:cancelado", "confirmacion-llegada", "viaje:motorista-llego", "viaje:iniciado"].forEach(ev => socket.off(ev));

    // 🔥 MODIFICACIÓN: Al conectar/reconectar, pedir el estado actual al servidor
    socket.on("connect", () => {
        console.log("🌐 Reconectado. Solicitando sincronización de estado...");
        socket.emit("sync-solicitado"); // Dispara la lógica de Snapshot en el backend
    });

    socket.on("viaje:cancelado", (data) => {
        const viajeActivo = getViajeEnCursoId();
        if (!viajeActivo) return;
        
        const idRecibido = data?.viajeId || data?.id;
        if (idRecibido && idRecibido !== viajeActivo) return;
        
        console.warn("🚨 Cancelado por el pasajero");
        limpiarInterfazViaje(detenerSimulacionETA);
        
        if (typeof Toastify !== "undefined") {
            Toastify({
                text: "❌ VIAJE CANCELADO POR EL PASAJERO",
                duration: 8000,
                gravity: "top",
                position: "center",
                style: {
                    background: "linear-gradient(to right,#ff5f6d,#ffc371)",
                    fontWeight: "900"
                }
            }).showToast();
        }
    });

    const procesarLlegadaExitosa = () => {
        if (!getViajeEnCursoId()) return;
        console.log("🟢 Llegada confirmada");
        setEstadoViaje("llego");
        reconstruirUIDesdeEstado();
        // Re-habilitar botón si estaba bloqueado
        UI_REFS.btnIniciar.disabled = false;
    };
    
    socket.on("confirmacion-llegada", procesarLlegadaExitosa);
    socket.on("viaje:motorista-llego", (data) => {
        if (data.viajeId === getViajeEnCursoId()) procesarLlegadaExitosa();
    });

    socket.on("viaje:iniciado", (data) => {
        const idRecibido = data.viajeId || data.id;
        const viajeIdActual = getViajeEnCursoId();
        if (!viajeIdActual || idRecibido !== viajeIdActual) return;
        
        console.log("🚀 Trayecto iniciado");
        setEstadoViaje("en_curso");
        reconstruirUIDesdeEstado();
        
        // Re-habilitar botón
        UI_REFS.btnIniciar.disabled = false;

        const pos = getUltimaPosicion();
        if (pos && data.destino) {
            setTimeout(() => dibujarRutaPremium(pos, data.destino), 300);
        }
    });

    // ---------------- LÓGICA DE CLICK ----------------
    if (!UI_REFS.btnIniciar.dataset.boundInicio) {
        UI_REFS.btnIniciar.dataset.boundInicio = "1";
        UI_REFS.btnIniciar.addEventListener("click", () => {
            const estado = getEstadoViaje();
            const viajeIdActual = getViajeEnCursoId();
            if (!estado || !viajeIdActual) return;
            
            // 🛡️ Bloqueo preventivo de UI
            UI_REFS.btnIniciar.disabled = true;

            if (estado === "asignado") {
                socket.emit("motorista-llego", { viajeId: viajeIdActual });
                return;
            }
            if (estado === "llego") {
                if (!confirm("¿Confirmas que el pasajero subió al vehículo?")) {
                    UI_REFS.btnIniciar.disabled = false;
                    return;
                }
                socket.emit("iniciar-viaje", { viajeId: viajeIdActual });
                return;
            }
        });
    }

    socket.on("error", (err) => {
        console.error("Socket Error:", err);
        UI_REFS.btnIniciar.disabled = false;
    });

    window.addEventListener("beforeunload", () => {
        clearTimeout(llegadaTimeout);
    });
}