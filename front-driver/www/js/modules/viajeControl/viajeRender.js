import { formatGourdes, getTripMoney, isCashMethod } from "../oferta/oferta.money.js?v=20260608-offer-net-cash";
import { getUltimaPosicion } from "../gps.js?v=20260716-live-trip-tracking";
import { getViajeEnCursoId } from "./viajeEstado.js";
import {
    formatearMetodoPago,
    limpiarDireccionDetalle,
    limpiarDireccionPrincipal,
    normalizarEstadoVisual,
    normalizarFotoUrl,
    obtenerDistanciaLabel,
    obtenerEtapaLabel,
    obtenerEtaLabel,
    obtenerFotoPerfil,
    obtenerNombrePasajero,
    obtenerServicioLabel
} from "./viajePresentacion.js?v=20260713-live-trip-tracking";
import { obtenerViajeActualUI, obtenerViajeReservadoUI } from "./viajeSelectors.js?v=20260711-trip-selectors";

let botonCobroInicializado = false;
let waitingTimerInterval = null;
let waitingTimerKey = "";
let etaCountdownInterval = null;
let etaCountdownKey = "";
let etaDeadlineMs = 0;
let etaLastIncomingMinutes = null;

export function actualizarDetalleViaje(viaje, estado) {
    const panel = document.getElementById("panelViajeControl");
    const eta = document.getElementById("viajeSheetEta");
    const etaLabel = document.getElementById("viajeSheetEtaLabel");
    const distanciaResumen = document.getElementById("viajeDistanciaResumen");
    const nombre = document.getElementById("viajePasajeroNombre");
    const avatar = document.getElementById("viajePasajeroAvatar");
    const foto = document.getElementById("viajePasajeroFoto");
    const rating = document.getElementById("viajePasajeroRating");
    const direccionPrincipal = document.getElementById("viajeDireccionPrincipal");
    const direccionDetalle = document.getElementById("viajeDireccionDetalle");
    const destinoPrincipal = document.getElementById("viajeDestinoPrincipal");
    const destinoDetalle = document.getElementById("viajeDestinoDetalle");
    const tiempo = document.getElementById("viajeTiempoEstimado");
    const distancia = document.getElementById("viajeDistancia");
    const etapa = document.getElementById("viajeEtapaLabel");
    const tipoServicio = document.getElementById("tripTipoServicio");
    const metodoPago = document.getElementById("tripMetodoPago");
    const tarifa = document.getElementById("tripTarifa");
    const waitingCard = document.getElementById("viajeWaitingCard");
    const completedCard = document.getElementById("viajeCompletedCard");
    const waitingTimer = document.getElementById("viajeWaitingTimer");
    const gananciaFinal = document.getElementById("viajeGananciaFinal");

    if (!viaje || !estado) {
        detenerWaitingTimer();
        detenerEtaCountdown();
        panel?.removeAttribute("data-trip-state");
        if (eta) eta.textContent = "--";
        if (distanciaResumen) distanciaResumen.textContent = "--";
        if (nombre) nombre.textContent = "Pasajero";
        actualizarAvatarPasajero(avatar, foto, "Pasajero", "");
        if (direccionPrincipal) direccionPrincipal.textContent = "Punto de recogida";
        if (direccionDetalle) direccionDetalle.textContent = "Detalle pendiente";
        if (destinoPrincipal) destinoPrincipal.textContent = "Destino";
        if (destinoDetalle) destinoDetalle.textContent = "Detalle pendiente";
        if (tiempo) tiempo.textContent = "--";
        if (distancia) distancia.textContent = "--";
        if (etapa) etapa.textContent = "Pickup";
        if (tipoServicio) tipoServicio.textContent = "--";
        if (metodoPago) metodoPago.textContent = "--";
        if (tarifa) tarifa.textContent = "--";
        waitingCard?.classList.add("hidden");
        completedCard?.classList.add("hidden");
        return;
    }

    panel?.setAttribute("data-trip-state", normalizarEstadoVisual(estado));
    const pasajero = viaje.pasajero || viaje.usuario || viaje.cliente || {};
    const passengerName = obtenerNombrePasajero(pasajero, viaje);
    const passengerRating = pasajero.rating || pasajero.calificacion || viaje.pasajeroRating || "--";
    const passengerPhoto = obtenerFotoPerfil(pasajero, viaje.pasajeroFoto);
    const vaDeVuelta = viaje?.idaVuelta?.estado === "retorno_en_curso";
    const esEnCurso = estado === "en_curso";
    const target = esEnCurso
        ? (vaDeVuelta ? (viaje.proximoDestino || viaje.origen) : (viaje.proximoDestino || viaje.destino))
        : viaje.origen;
    const origen = viaje.origen || {};
    const destino = vaDeVuelta ? (viaje.origen || {}) : (viaje.destino || viaje.proximoDestino || {});
    const fallbackAddress = esEnCurso ? "Destino" : "Punto de recogida";
    const targetAddress = target?.direccion || target?.address || fallbackAddress;
    const origenAddress = origen?.direccion || origen?.address || targetAddress || "Punto de recogida";
    const destinoAddress = destino?.direccion || destino?.address || "Destino";
    const driverPosition = getUltimaPosicion() || window.ultimaPosicionMotorista || window.driverLastPosition || null;
    const distanceLabel = obtenerDistanciaLabel(viaje, estado, target, driverPosition);
    const etaText = obtenerEtaLabel(viaje, estado, distanceLabel);
    const detail = esEnCurso
        ? `${viaje.destino?.direccion ? "Ruta al destino" : "Ruta activa"}`
        : estado === "llego"
            ? "El pasajero puede subir ahora"
            : "Ruta al pasajero";
    const money = getTripMoney(viaje);
    const serviceLabel = obtenerServicioLabel(viaje);

    actualizarEtaCountdown({ eta, tiempo, viaje, estado, etaText });
    if (etaLabel) etaLabel.textContent = etaText.label;
    if (distanciaResumen) distanciaResumen.textContent = distanceLabel;
    if (nombre) nombre.textContent = passengerName;
    actualizarAvatarPasajero(avatar, foto, passengerName, passengerPhoto);
    const ratingHtml = `<i class="fa-solid fa-star" aria-hidden="true"></i> ${passengerRating}`;
    if (rating && rating.innerHTML !== ratingHtml) rating.innerHTML = ratingHtml;
    if (direccionPrincipal) direccionPrincipal.textContent = limpiarDireccionPrincipal(origenAddress);
    if (direccionDetalle) direccionDetalle.textContent = limpiarDireccionDetalle(origenAddress, detail);
    if (destinoPrincipal) destinoPrincipal.textContent = limpiarDireccionPrincipal(destinoAddress);
    if (destinoDetalle) destinoDetalle.textContent = limpiarDireccionDetalle(destinoAddress, vaDeVuelta ? "Retorno" : "Destino");
    if (distancia) distancia.textContent = distanceLabel;
    if (etapa) etapa.textContent = obtenerEtapaLabel(viaje, estado);
    if (tipoServicio) tipoServicio.textContent = serviceLabel;
    if (metodoPago) metodoPago.textContent = formatearMetodoPago(money.metodoPago);
    if (tarifa) tarifa.textContent = formatGourdes(money.totalCobrar || money.precio || viaje.precio || 0);

    waitingCard?.classList.toggle("hidden", estado !== "llego");
    completedCard?.classList.toggle("hidden", !["completado", "finalizado"].includes(estado));

    if (estado === "llego" && waitingTimer) {
        iniciarWaitingTimer(waitingTimer, viaje);
    } else {
        detenerWaitingTimer();
    }

    if (gananciaFinal) {
        gananciaFinal.textContent = formatGourdes(money.gananciaMotorista || money.totalMotorista || viaje.gananciaMotorista || viaje.precio || 0);
    }
}

export function actualizarResumenReserva() {
    const card = document.getElementById("tripReservationCard");
    if (!card) return;

    const reservado = obtenerViajeReservadoUI();
    const hayReservaSeparada = !!reservado && String(reservado.viajeId || reservado.id || "") !== String(getViajeEnCursoId() || "");

    card.classList.toggle("hidden", !hayReservaSeparada);
    if (!hayReservaSeparada) return;

    const nombre = document.getElementById("tripReservationName");
    const route = document.getElementById("tripReservationRoute");
    const pasajero = reservado.pasajero || reservado.usuario || reservado.cliente || {};
    const origen = limpiarDireccionPrincipal(reservado.origen?.direccion || reservado.origen?.address || "Punto de recogida");
    const destino = limpiarDireccionPrincipal(reservado.destino?.direccion || reservado.destino?.address || "Destino");

    if (nombre) nombre.textContent = obtenerNombrePasajero(pasajero, reservado);
    if (route) route.textContent = `${origen} -> ${destino}`;
}

export function actualizarBotonCobro(viaje, estado) {
    const btnCobrar = document.getElementById("btnCobrarEfectivo");
    const montoCobrar = document.getElementById("montoCobrarEfectivo");
    if (!btnCobrar || !montoCobrar) return;

    const money = getTripMoney(viaje || {});
    const mostrar = !!viaje && ["asignado", "llego", "en_curso"].includes(estado);
    const esEfectivo = isCashMethod(money.metodoPago);

    if (!mostrar) {
        btnCobrar.classList.add("hidden");
        btnCobrar.style.display = "none";
        btnCobrar.disabled = true;
        btnCobrar.setAttribute("aria-disabled", "true");
        btnCobrar.removeAttribute("data-monto");
        montoCobrar.textContent = "--";
        return;
    }

    const monto = formatGourdes(money.totalCobrar || money.precio || viaje.precio || 0);
    montoCobrar.textContent = monto;
    btnCobrar.dataset.monto = monto;
    btnCobrar.disabled = !esEfectivo;
    btnCobrar.setAttribute("aria-disabled", esEfectivo ? "false" : "true");
    btnCobrar.classList.toggle("is-cash", esEfectivo);
    btnCobrar.classList.remove("hidden");
    btnCobrar.style.display = "flex";

    if (!botonCobroInicializado) {
        botonCobroInicializado = true;
        btnCobrar.addEventListener("click", () => {
            const viajeActual = obtenerViajeActualUI();
            const moneyActual = getTripMoney(viajeActual || {});
            if (!isCashMethod(moneyActual.metodoPago)) return;

            const montoActual = btnCobrar.dataset.monto || montoCobrar.textContent || "0 G";
            if (typeof Toastify !== "undefined") {
                Toastify({
                    text: `A cobrar en efectivo: ${montoActual}`,
                    duration: 3500,
                    gravity: "top",
                    position: "center",
                    style: {
                        background: "linear-gradient(135deg, #0f766e, #2563eb)",
                        borderRadius: "12px",
                        fontWeight: "900"
                    }
                }).showToast();
            }
        });
    }
}

function actualizarAvatarPasajero(avatar, foto, passengerName, passengerPhoto) {
    const initial = String(passengerName || "P").trim().charAt(0).toUpperCase() || "P";
    const fallback = avatar?.querySelector("span");
    if (fallback) fallback.textContent = initial;
    const photoUrl = normalizarFotoUrl(passengerPhoto);
    if (!foto) {
        if (avatar && !fallback) avatar.textContent = initial;
        return;
    }

    foto.onerror = () => {
        foto.removeAttribute("src");
        foto.hidden = true;
        foto.onerror = null;
    };

    if (photoUrl) {
        if (foto.getAttribute("src") !== photoUrl) foto.src = photoUrl;
        foto.hidden = false;
    } else {
        foto.removeAttribute("src");
        foto.hidden = true;
    }
}

function iniciarWaitingTimer(node, viaje) {
    const tripKey = String(viaje?.viajeId || viaje?._id || "viaje");
    if (waitingTimerInterval && waitingTimerKey.startsWith(`${tripKey}:`)) return;
    const rawStart = viaje?.llegoAt || viaje?.arrivedAt;
    const numericStart = Number(rawStart);
    const parsedStart = rawStart ? Date.parse(rawStart) : NaN;
    const start = Number.isFinite(numericStart) && numericStart > 0
        ? numericStart
        : Number.isFinite(parsedStart) ? parsedStart : Date.now();
    const key = `${tripKey}:${start}`;
    detenerWaitingTimer();
    waitingTimerKey = key;
    const render = () => {
        const elapsed = Math.max(0, Date.now() - start);
        const totalSeconds = Math.floor(elapsed / 1000);
        const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const secs = String(totalSeconds % 60).padStart(2, "0");
        node.textContent = `${mins}:${secs}`;
    };
    render();
    waitingTimerInterval = setInterval(render, 1000);
}

function detenerWaitingTimer() {
    if (waitingTimerInterval) {
        clearInterval(waitingTimerInterval);
        waitingTimerInterval = null;
    }
    waitingTimerKey = "";
}

function actualizarEtaCountdown({ eta, tiempo, viaje, estado, etaText }) {
    if (estado === "llego") {
        detenerEtaCountdown();
        setTextIfChanged(eta, "00:00");
        setTextIfChanged(tiempo, "00:00");
        return;
    }

    const incomingMinutes = Number.parseFloat(String(etaText?.valor || "").replace(",", "."));
    if (!Number.isFinite(incomingMinutes) || incomingMinutes <= 0) {
        detenerEtaCountdown();
        setTextIfChanged(eta, "--");
        setTextIfChanged(tiempo, "--");
        return;
    }

    const key = `${viaje?.viajeId || viaje?._id || "viaje"}:${estado}`;
    const now = Date.now();
    const remainingMinutes = etaDeadlineMs > now ? (etaDeadlineMs - now) / 60000 : 0;
    if (etaCountdownKey !== key || !etaDeadlineMs) {
        etaCountdownKey = key;
        etaDeadlineMs = now + incomingMinutes * 60000;
    } else if (
        incomingMinutes < remainingMinutes - 0.2 ||
        (etaLastIncomingMinutes !== null && incomingMinutes > etaLastIncomingMinutes + 2)
    ) {
        etaDeadlineMs = now + incomingMinutes * 60000;
    }
    etaLastIncomingMinutes = incomingMinutes;

    const render = () => {
        const remaining = Math.max(0, etaDeadlineMs - Date.now());
        const label = remaining <= 60000 ? "Llegando" : `${Math.ceil(remaining / 60000)} min`;
        setTextIfChanged(eta, label);
        setTextIfChanged(tiempo, label);
    };

    render();
    if (!etaCountdownInterval) etaCountdownInterval = window.setInterval(render, 1000);
}

function detenerEtaCountdown() {
    if (etaCountdownInterval) window.clearInterval(etaCountdownInterval);
    etaCountdownInterval = null;
    etaCountdownKey = "";
    etaDeadlineMs = 0;
    etaLastIncomingMinutes = null;
}

function setTextIfChanged(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}
