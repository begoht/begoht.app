import { borrarRuta } from "../map.js";
import { 
    viajesActivos, 
    getViajeEnCursoId, setViajeEnCurso, 
    getViajeReservadoId, setViajeReservadoId,
    getEstadoViaje, setEstadoViaje,
    llegadaRetryTimeout
} from "./viajeEstado.js";
import { reconstruirUIDesdeEstado, limpiarViajeMain } from "./viajeUI.js";

/*************************************************
 * 🔊 AUDIO
 *************************************************/
const offerSound = new Audio(new URL("../../../assets/sounds/bego-offer.wav?v=20260602-bego-offer-persistent", import.meta.url));
offerSound.preload = "auto";

export function playOfferSound() {
    try {
        offerSound.currentTime = 0;
        offerSound.play().catch(() => {});
    } catch (err) {}
}

/*************************************************
 * 🎛 INIT CONTROL (SOCKETS)
 *************************************************/
export function initViajeControl(socket, uiElements = {}) {
    console.log("🎛 initViajeControl iniciado");

    if (!socket) {
        console.error("❌ Socket no disponible en initViajeControl");
        return;
    }

    const elements = {
        btnIniciar: uiElements.btnIniciar || document.getElementById("btnIniciarViaje"),
        btnFinalizar: uiElements.btnFinalizar || document.getElementById("btnFinalizar"),
        estadoBox: uiElements.estadoBox || document.getElementById("estadoViaje"),
        panelControl: uiElements.panelControl || document.getElementById("panelViajeControl")
    };

    ["viaje-confirmado-motorista", "viaje-siguiente-confirmado", "iniciar-viaje-siguiente", "viaje-finalizado", "viaje:cancelado", "viaje-asignado"].forEach(ev => socket.off(ev));

    socket.on("viaje-confirmado-motorista", (data) => {
        const id = data?.viaje?._id || data?.viaje?.id || data?.viajeId;
        if (!id) return;
        console.log("✅ Viaje inmediato confirmado:", id);
        registrarViaje(id, data.viaje || data);
    });

    socket.on("viaje-siguiente-confirmado", (data) => {
        const id = data?.viaje?._id || data?.viaje?.id || data?.viajeId;
        if (!id) return;
        setViajeReservadoId(id);
        console.log("📌 Reserva confirmada en cola:", id);
        if (typeof Toastify !== "undefined") {
            Toastify({
                text: "📌 VIAJE EN COLA: Se activará al terminar el actual",
                duration: 5000,
                gravity: "top", position: "center",
                style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
            }).showToast();
        }
    });

    socket.on("iniciar-viaje-siguiente", (data) => {
        const id = data?.viajeId || data?.viaje?._id;
        if (!id) return;
        console.log("🚀 Activando reserva desde cola:", id);
        setViajeReservadoId(null);
        registrarViaje(id, data);
        if (typeof Toastify !== "undefined") {
            Toastify({
                text: "🚀 NUEVO VIAJE ACTIVADO: Dirígete al origen",
                duration: 7000,
                gravity: "top", position: "center",
                style: { background: "linear-gradient(to right, #f8b500, #fceabb)", color: "#000" }
            }).showToast();
        }
    });

    socket.on("viaje-finalizado", (data) => {
        const idFinalizado = data?.viajeId || data?.id;
        const viajeActivo = getViajeEnCursoId();
        
        if (!idFinalizado || idFinalizado !== viajeActivo) return;
        
        console.log("🏁 Finalización confirmada");
        
        /*************************************************
         * 🔥 LIMPIEZA TOTAL DE ESTADO GLOBAL
        *************************************************/
       
       setViajeEnCurso(null);
       setEstadoViaje(null);
       viajesActivos.clear();
       
       // 🔥 limpiar también ofertaState
       import("../oferta/oferta.state.js").then(mod => {
           mod.ofertaState.viajeActual = null;
           mod.ofertaState.aceptando = false;
        });
        
        // 🔥 limpiar storage
        localStorage.removeItem("viajeEnCursoId");
        window.viajeEnCursoId = null;
        
        limpiarViajeMain(elements);
        
    });

    socket.on("viaje-asignado", (data) => {
        const id = data?.viajeId || data?._id;
        if (!id) return;

        console.log("🔄 Reserva promovida a viaje actual por cancelación:", id);
        
        // Limpiamos el ID de reserva porque ahora es el viaje en curso
        setViajeReservadoId(null);
        
        // Registramos y reconstruimos la UI
        registrarViaje(id, data);

        if (typeof Toastify !== "undefined") {
            Toastify({
                text: "🔄 VIAJE ACTUALIZADO: La reserva se ha activado.",
                duration: 5000,
                style: { background: "linear-gradient(to right, #4facfe, #00f2fe)" }
            }).showToast();
        }
    });

    socket.on("viaje:cancelado", (data) => {
        const viajeActivo = getViajeEnCursoId();
        if (!viajeActivo) return;
        
        const idRecibido = data?.viajeId || data?.id;
        if (idRecibido && idRecibido !== viajeActivo) return;
        
        console.warn("🚨 Cancelación recibida en control");
        
        // 1. LIMPIAR ESTADO LOCAL
        setViajeEnCurso(null);
        setEstadoViaje(null);
        viajesActivos.clear();
        localStorage.removeItem("viajeEnCursoId"); // Importante limpiar storage
        reconstruirUIDesdeEstado();
        
        // 2. 🔥 SOLUCIÓN: AVISAR AL SERVIDOR PARA VOLVER AL MAPA
        // Obtenemos la ubicación actual para que el server nos ponga en Redis GEO
        navigator.geolocation.getCurrentPosition((pos) => {
            socket.emit("motorista:online", {
                motoristaId: socket.user?.id || localStorage.getItem("userId"),
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            });
            console.log("📡 Disponibilidad enviada tras cancelación");
        });
        
        if (typeof Toastify !== "undefined") {
            Toastify({
                text: "⚠️ VIAJE CANCELADO POR EL PASAJERO",
                duration: 6000,
                style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" }
            }).showToast();
        }
        else if (idCancelado === viajeReservado) {
            setViajeReservadoId(null);
            console.log("🗑️ Reserva en cola eliminada");
            // No limpiamos el viaje actual, solo notificamos
        }
    });
}
    
/*************************************************
 * 📦 REGISTRAR VIAJE ACTIVO
 *************************************************/
export function registrarViaje(id, data = {}) {
    if (!id) return;
    const hayViajeActivo = !!getViajeEnCursoId();

    if ((data.estado === "reservado" || data.esReserva) && hayViajeActivo) {
        setViajeReservadoId(id);
        console.log("📌 Reserva guardada sin afectar viaje activo");
        return;
    }

    if (data.estado === "reservado" || data.esReserva) {
        setViajeReservadoId(id);
        setEstadoViaje("reservado");
        reconstruirUIDesdeEstado();
        return;
    }

    setViajeEnCurso(id);
    /* 🔥 EXPONER GLOBAL PARA OTROS MÓDULOS */
    
    window.viajeEnCursoId = id;
    localStorage.setItem("viajeEnCursoId", id);

    setViajeReservadoId(null);
    const estadoInicial = data.estado || "asignado";
    setEstadoViaje(estadoInicial);

    const existente = viajesActivos.get(id) || {};
    viajesActivos.set(id, { ...existente, id, estado: estadoInicial, ...data });

    reconstruirUIDesdeEstado();
}
