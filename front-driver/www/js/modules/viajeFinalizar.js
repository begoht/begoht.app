import { 
    viajesActivos, 
    getViajeEnCursoId, 
    setViajeEnCurso 
} from "./viajeControl/viajeEstado.js"; 

import { limpiarViajeMain } from "./viajeControl/viajeUI.js";

import { initViajeControl } from "./viajeControl/viajeControl.js";

import { borrarRuta } from "./map.js";

const viajesFinalizadosProcesados = new Set();

export function initViajeFinalizar(socket) {
  const btnFinalizar = document.getElementById("btnFinalizar");
  const btnIniciar = document.getElementById("btnIniciarViaje");
  const estadoBox = document.getElementById("estadoViaje");
  const panelViajeControl = document.getElementById("panelViajeControl");

  // --- 1. GESTIÓN DEL CLICK EN FINALIZAR ---
  document.addEventListener("click", (e) => {
    const target = e.target.closest("#btnFinalizar");
    if (!target || target.disabled) return;

    const viajeId = getViajeEnCursoId();
    if (!viajeId) {
        console.warn("⚠️ No hay un ID de viaje activo para finalizar");
        return;
    }

    if (!confirm("¿Deseas finalizar el viaje actual y cobrar?")) return;

    // Bloqueo visual
    target.disabled = true; 
    target.textContent = "Procesando...";
    
    // FAIL-SAFE: Si en 8 segundos el servidor no responde, desbloquear botón
    const timerGuard = setTimeout(() => {
        if (target.textContent === "Procesando...") {
            target.disabled = false;
            target.textContent = "FINALIZAR VIAJE";
            console.error("❌ Tiempo de espera agotado al finalizar viaje.");
        }
    }, 8000);

    console.log("🏁 Enviando finalizar-viaje para:", viajeId);
    socket.emit("finalizar-viaje", { 
        viajeId: viajeId,
        motoristaId: socket.user?._id || socket.user?.id 
    });
    
    // Guardamos el timer en el botón por si necesitamos limpiarlo
    target.dataset.timerId = timerGuard;
  });
  
  // --- 2. ESCUCHAR CONFIRMACIÓN DE FINALIZACIÓN ---
  socket.on("viaje-finalizado", (data) => {
    const idFinalizado = data.viajeId || data.id;
    if (idFinalizado && viajesFinalizadosProcesados.has(idFinalizado)) return;
    if (idFinalizado) viajesFinalizadosProcesados.add(idFinalizado);
    console.log("🏁 Confirmación de fin de viaje recibida:", idFinalizado);

    // Limpiar el timer de seguridad si existe
    const btn = document.getElementById("btnFinalizar");
    if (btn && btn.dataset.timerId) {
        clearTimeout(parseInt(btn.dataset.timerId));
        btn.textContent = "FINALIZAR VIAJE";
        btn.disabled = false;
    }

    // Notificación de cobro
    if (typeof Toastify !== "undefined") {
        Toastify({ 
            text: `✅ VIAJE FINALIZADO\n💰 Cobrar: ${data.total || 0} G`, 
            duration: 5000,
            gravity: "top",
            position: "center",
            style: { background: "linear-gradient(to right, #00b09b, #96c93d)", fontWeight: "bold" }
        }).showToast();
    }

    // ELIMINAR de la lista de activos
    viajesActivos.delete(idFinalizado);

    // Si el viaje que terminó es el que estaba en curso, limpiar la variable
    if (getViajeEnCursoId() === idFinalizado) {
        setViajeEnCurso(null);
    }

    // Limpieza de UI
    limpiarViajeMain({ 
        btnIniciar, 
        btnFinalizar, 
        estadoBox, 
        panelControl: panelViajeControl 
    });

    if (typeof borrarRuta === "function") borrarRuta();

    window.dispatchEvent(new CustomEvent("driver:trip-finalized", { detail: data }));
  });

  // --- 3. MANEJO DE ERRORES DEL SERVIDOR ---
  socket.on("error-finalizar", (err) => {
    alert("Error: " + (err.msg || "No se pudo finalizar el viaje"));
    const btn = document.getElementById("btnFinalizar");
    if (btn) {
        btn.disabled = false;
        btn.textContent = "FINALIZAR VIAJE";
        if (btn.dataset.timerId) clearTimeout(parseInt(btn.dataset.timerId));
    }
  });
}
