import {
    viajesActivos,
    getViajeEnCursoId,
    setViajeEnCurso,
    getViajeReservadoId,
    setViajeReservadoId,
    setEstadoViaje
} from "./viajeEstado.js";
import { reconstruirUIDesdeEstado } from "./viajeUI.js?v=20260710-real-trip-panel";

const offerSound = new Audio(new URL("../../../assets/sounds/bego-offer.wav?v=20260602-bego-offer-persistent", import.meta.url));
offerSound.preload = "auto";

export function playOfferSound() {
    try {
        offerSound.currentTime = 0;
        offerSound.play().catch(() => {});
    } catch (err) {}
}

export function initViajeControl(socket, uiElements = {}) {
    console.log("initViajeControl iniciado");

    if (!socket) {
        console.error("Socket no disponible en initViajeControl");
        return;
    }

    [
        "viaje-confirmado-motorista",
        "viaje-siguiente-confirmado",
        "iniciar-viaje-siguiente",
        "viaje:cancelado",
        "viaje-asignado"
    ].forEach((eventName) => socket.off(eventName));

    socket.on("viaje-confirmado-motorista", (data) => {
        const id = data?.viaje?._id || data?.viaje?.id || data?.viajeId;
        if (!id) return;

        console.log("Viaje inmediato confirmado:", id);
        registrarViaje(id, data.viaje || data);
    });

    socket.on("viaje-siguiente-confirmado", (data) => {
        const id = data?.viaje?._id || data?.viaje?.id || data?.viajeId;
        if (!id) return;

        setViajeReservadoId(id);
        console.log("Reserva confirmada en cola:", id);

        if (typeof Toastify !== "undefined") {
            Toastify({
                text: "VIAJE EN COLA: Se activara al terminar el actual",
                duration: 5000,
                gravity: "top",
                position: "center",
                style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
            }).showToast();
        }
    });

    socket.on("iniciar-viaje-siguiente", (data) => {
        const id = data?.viajeId || data?.viaje?._id;
        if (!id) return;

        console.log("Activando reserva desde cola:", id);
        setViajeReservadoId(null);
        registrarViaje(id, data);

        if (typeof Toastify !== "undefined") {
            Toastify({
                text: "NUEVO VIAJE ACTIVADO: Dirigete al origen",
                duration: 7000,
                gravity: "top",
                position: "center",
                style: {
                    background: "linear-gradient(to right, #f8b500, #fceabb)",
                    color: "#000"
                }
            }).showToast();
        }
    });

    socket.on("viaje-asignado", (data) => {
        const id = data?.viajeId || data?._id;
        if (!id) return;

        console.log("Reserva promovida a viaje actual por cancelacion:", id);

        setViajeReservadoId(null);
        registrarViaje(id, data);

        if (typeof Toastify !== "undefined") {
            Toastify({
                text: "VIAJE ACTUALIZADO: La reserva se ha activado.",
                duration: 5000,
                style: { background: "linear-gradient(to right, #4facfe, #00f2fe)" }
            }).showToast();
        }
    });

    socket.on("viaje:cancelado", (data) => {
        const viajeActivo = getViajeEnCursoId();
        const viajeReservado = getViajeReservadoId();
        const idRecibido = data?.viajeId || data?.id;

        if (idRecibido && viajeReservado && String(idRecibido) === String(viajeReservado)) {
            setViajeReservadoId(null);
            console.log("Reserva en cola eliminada");

            if (!viajeActivo) {
                setEstadoViaje(null);
                reconstruirUIDesdeEstado();
            }

            if (typeof Toastify !== "undefined") {
                Toastify({
                    text: data?.reasignado ? "RESERVA REASIGNADA POR BeGO" : "RESERVA CANCELADA",
                    duration: 6000,
                    style: { background: "linear-gradient(to right, #1d4ed8, #38bdf8)" }
                }).showToast();
            }
            return;
        }

        if (!viajeActivo) return;
        if (idRecibido && String(idRecibido) !== String(viajeActivo)) return;

        console.warn("Cancelacion recibida en control");

        setViajeEnCurso(null);
        setEstadoViaje(null);
        viajesActivos.clear();
        localStorage.removeItem("viajeEnCursoId");
        window.viajeEnCursoId = null;
        reconstruirUIDesdeEstado();

        navigator.geolocation.getCurrentPosition((pos) => {
            socket.emit("motorista:online", {
                motoristaId: socket.user?.id || localStorage.getItem("userId"),
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            });
            console.log("Disponibilidad enviada tras cancelacion");
        });

        if (typeof Toastify !== "undefined") {
            Toastify({
                text: "VIAJE CANCELADO POR EL PASAJERO",
                duration: 6000,
                style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" }
            }).showToast();
        }
    });
}

export function registrarViaje(id, data = {}) {
    if (!id) return;

    const viajeId = String(id);
    const hayViajeActivo = !!getViajeEnCursoId();

    if ((data.estado === "reservado" || data.esReserva) && hayViajeActivo) {
        setViajeReservadoId(viajeId);
        console.log("Reserva guardada sin afectar viaje activo");
        return;
    }

    if (data.estado === "reservado" || data.esReserva) {
        setViajeReservadoId(viajeId);
        setEstadoViaje("reservado");
        reconstruirUIDesdeEstado();
        return;
    }

    setViajeEnCurso(viajeId);
    window.viajeEnCursoId = viajeId;
    localStorage.setItem("viajeEnCursoId", viajeId);

    setViajeReservadoId(null);
    const estadoInicial = data.estado || "asignado";
    setEstadoViaje(estadoInicial);

    const existente = viajesActivos.get(viajeId) || {};
    viajesActivos.set(viajeId, {
        ...existente,
        id: viajeId,
        estado: estadoInicial,
        ...data
    });

    reconstruirUIDesdeEstado();
}
