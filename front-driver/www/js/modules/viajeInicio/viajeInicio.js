import { 
    getEstadoViaje, setEstadoViaje, 
    getViajeEnCursoId, setViajeEnCurso, 
    viajesActivos 
} from "../viajeControl/viajeEstado.js"; 
import { reconstruirUIDesdeEstado } from "../viajeControl/viajeUI.js?v=20260710-reservation-panel";
import { getUltimaPosicion } from "../gps.js?v=20260627-map-icons";
import { dibujarRutaPremium } from "../map.js?v=20260702-visible-labels";
import {
    ARRIVAL_MAX_DISTANCE_METERS,
    validarCercaniaViaje,
    notificarGuardia
} from "../tripGuards.js?v=20260627-map-fluid-arrival";
import { UI_REFS, llegadaTimeout } from "./viajeInicioEstado.js";
import { limpiarInterfazViaje, redibujarRutaRecovery } from "./viajeInicioUI.js?v=20260623-roundtrip-v2";
import { initViajeRecovery } from "./viajeRecovery.js?v=20260623-roundtrip-v2";

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
        viajesActivos.set(viajeIdActual, {
            ...(viajesActivos.get(viajeIdActual) || {}),
            ...data,
            estado: "en_curso"
        });
        setEstadoViaje("en_curso");
        reconstruirUIDesdeEstado();
        
        // Re-habilitar botón
        UI_REFS.btnIniciar.disabled = false;

        const pos = getUltimaPosicion();
        const target = data.proximoDestino || data.destino;
        if (pos && target) {
            setTimeout(() => dibujarRutaPremium(pos, target), 300);
        }
    });

    // ---------------- LÓGICA DE CLICK ----------------
    if (!UI_REFS.btnIniciar.dataset.boundInicio) {
        UI_REFS.btnIniciar.dataset.boundInicio = "1";
        UI_REFS.btnIniciar.addEventListener("click", async () => {
            const estado = getEstadoViaje();
            const viajeIdActual = getViajeEnCursoId();
            if (!estado || !viajeIdActual) return;
            
            // 🛡️ Bloqueo preventivo de UI
            UI_REFS.btnIniciar.disabled = true;

            if (estado === "asignado") {
                const viajeActual = obtenerViajeActual(viajeIdActual);
                const guard = await validarCercaniaViaje({
                    viaje: viajeActual,
                    targetKey: "origen",
                    maxDistanceMeters: ARRIVAL_MAX_DISTANCE_METERS,
                    missingTargetMessage: "Impossible de verifier le point de prise en charge.",
                    farMessage: (distancia, limite) =>
                        `Tu es encore a ${distancia} du passager. Rapproche-toi a ${limite} pour aviser l'arrivee.`
                });

                if (!guard.ok) {
                    UI_REFS.btnIniciar.disabled = false;
                    return;
                }

                socket.emit("motorista-llego", {
                    viajeId: viajeIdActual,
                    lat: guard.posicion.lat,
                    lng: guard.posicion.lng,
                    distanciaMetros: Math.round(guard.distanciaMetros)
                });
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

    socket.off("error-operacion", onErrorOperacionViaje);
    socket.on("error-operacion", onErrorOperacionViaje);

    window.addEventListener("beforeunload", () => {
        clearTimeout(llegadaTimeout);
    });
}

function obtenerViajeActual(viajeId) {
    return viajesActivos.get(viajeId) || viajesActivos.get(String(viajeId)) || {};
}

function onErrorOperacionViaje(err = {}) {
    const code = String(err?.code || "");
    if (!code.startsWith("DISTANCIA_")) return;

    const btnIniciar = document.getElementById("btnIniciarViaje");
    if (btnIniciar) btnIniciar.disabled = false;

    notificarGuardia(err.msg || "Rapproche-toi du point indique pour continuer.", "#f59e0b");
}
