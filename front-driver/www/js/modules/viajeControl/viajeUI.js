import { borrarRuta } from "../map.js?v=20260710-route-icons";
import {
    getEstadoViaje,
    getViajeEnCursoId,
    getViajeReservadoId,
    setViajeEnCurso,
    setViajeReservadoId,
    setEstadoViaje,
    viajesActivos,
    llegadaRetryTimeout,
    setLlegadaRetryTimeout,
    setLlegadaLock
} from "./viajeEstado.js";
import { formatGourdes, getTripMoney, isCashMethod } from "../oferta/oferta.money.js?v=20260608-offer-net-cash";
import { getUltimaPosicion } from "../gps.js?v=20260711-driver-gps-modular";
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
} from "./viajePresentacion.js?v=20260711-trip-presentation";

let botonCobroInicializado = false;
let botonesAccionInicializados = false;
let sheetDragInicializado = false;
let gpsUiListenerInicializado = false;
let waitingTimerInterval = null;

export function reconstruirUIDesdeEstado() {
    const estado = getEstadoViaje();
    const btnIniciar = document.getElementById("btnIniciarViaje");
    const btnFinalizar = document.getElementById("btnFinalizar");
    const btnIniciarVuelta = document.getElementById("btnIniciarVuelta");
    const btnAnularVuelta = document.getElementById("btnAnularVuelta");
    const btnBuscarSiguiente = document.getElementById("btnBuscarSiguienteViaje");
    const estadoBox = document.getElementById("estadoViaje");
    const panel = document.getElementById("panelViajeControl");
    const viajeActual = obtenerViajeActualUI();
    const estadoIdaVuelta = viajeActual?.idaVuelta?.estado || "";
    inicializarAccionesViaje();
    actualizarResumenReserva();

    if (!estado) {
        if (btnIniciar) btnIniciar.style.display = "none";
        if (btnFinalizar) btnFinalizar.style.display = "none";
        if (btnIniciarVuelta) btnIniciarVuelta.style.display = "none";
        if (btnAnularVuelta) btnAnularVuelta.style.display = "none";
        if (btnBuscarSiguiente) btnBuscarSiguiente.style.display = "none";
        ocultarPanelViaje(panel);
        document.body.classList.remove("driver-trip-active");
        if (estadoBox) estadoBox.innerText = "En attente de courses";
        actualizarBotonCobro(null, null);
        actualizarDetalleViaje(null, null);
        actualizarResumenReserva();
        return;
    }

    panel?.classList.remove("hidden");
    mostrarPanelViaje(panel);
    document.body.classList.add("driver-trip-active");
    actualizarBotonCobro(viajeActual, estado);
    actualizarDetalleViaje(viajeActual, estado);
    actualizarResumenReserva();
    if (btnIniciarVuelta) btnIniciarVuelta.style.display = "none";
    if (btnAnularVuelta) btnAnularVuelta.style.display = "none";
    if (btnBuscarSiguiente) btnBuscarSiguiente.style.display = "none";

    switch (estado) {
        case "reservado":
            estadoBox && (estadoBox.innerText = "Viaje en cola");
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "ofertando":
            if (estadoBox) estadoBox.innerText = "Oferta en espera...";
            mostrarPanelViaje(panel);
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "asignado":
            estadoBox && (estadoBox.innerText = "En camino al pasajero");
            if (btnIniciar) {
                btnIniciar.style.display = "flex";
                btnIniciar.disabled = false;
                btnIniciar.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i> LLEGUE AL PUNTO DE RECOGIDA`;
                btnIniciar.classList.remove("btn-success");
                btnIniciar.classList.add("btn-warning");
            }
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "llego":
            estadoBox && (estadoBox.innerText = "Pasajero en espera");
            if (btnIniciar) {
                btnIniciar.style.display = "flex";
                btnIniciar.disabled = false;
                btnIniciar.innerHTML = `<i class="fa-solid fa-play" aria-hidden="true"></i> INICIAR VIAJE`;
                btnIniciar.classList.remove("btn-warning");
                btnIniciar.classList.add("btn-success");
            }
            if (btnFinalizar) btnFinalizar.style.display = "none";
            break;

        case "en_curso": {
            const esEnvio = viajeActual?.tipo === "envio";
            if (estadoIdaVuelta === "retorno_pendiente") {
                estadoBox && (estadoBox.innerText = "En attente de la decision du passager");
                if (btnIniciar) btnIniciar.style.display = "none";
                if (btnFinalizar) btnFinalizar.style.display = "none";
                if (btnIniciarVuelta) btnIniciarVuelta.style.display = "none";
                if (btnAnularVuelta) btnAnularVuelta.style.display = "none";
                break;
            }

            const vaDeVuelta = estadoIdaVuelta === "retorno_en_curso";
            estadoBox && (estadoBox.innerText = vaDeVuelta
                ? "Vuelta en curso al origen"
                : esEnvio ? "Entrega en curso - pide el codigo" : "Viaje en curso a destino");
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) {
                btnFinalizar.style.display = "flex";
                btnFinalizar.innerHTML = `<i class="fa-solid fa-flag-checkered" aria-hidden="true"></i> ${vaDeVuelta ? "FINALIZAR VUELTA" : esEnvio ? "CONFIRMAR ENTREGA" : "FINALIZAR VIAJE"}`;
            }
            break;
        }

        case "completado":
        case "finalizado":
            estadoBox && (estadoBox.innerText = "Viaje completado");
            if (btnIniciar) btnIniciar.style.display = "none";
            if (btnFinalizar) btnFinalizar.style.display = "none";
            if (btnBuscarSiguiente) {
                btnBuscarSiguiente.style.display = "flex";
                btnBuscarSiguiente.onclick = () => limpiarViajeMain({
                    btnIniciar,
                    btnFinalizar,
                    panelControl: panel,
                    estadoBox
                });
            }
            break;
    }
}

export function limpiarViajeMain(ui = {}) {
    console.log("Limpiando UI de viaje COMPLETO");

    if (typeof borrarRuta === "function") borrarRuta();

    setViajeEnCurso(null);
    setEstadoViaje(null);
    setLlegadaLock(false);

    viajesActivos.clear();
    setViajeReservadoId(null);

    clearTimeout(llegadaRetryTimeout);
    setLlegadaRetryTimeout(null);

    import("../oferta/oferta.render.js?v=20260702-offer-recovery").then(mod => {
        mod.limpiarOferta();
    }).catch(err => {
        console.warn("No se pudo limpiar oferta:", err);
    });

    if (ui.btnIniciar) ui.btnIniciar.style.display = "none";
    if (ui.btnFinalizar) ui.btnFinalizar.style.display = "none";
    document.getElementById("btnIniciarVuelta")?.style && (document.getElementById("btnIniciarVuelta").style.display = "none");
    document.getElementById("btnAnularVuelta")?.style && (document.getElementById("btnAnularVuelta").style.display = "none");
    document.getElementById("btnBuscarSiguienteViaje")?.style && (document.getElementById("btnBuscarSiguienteViaje").style.display = "none");
    actualizarBotonCobro(null, null);
    actualizarDetalleViaje(null, null);

    if (ui.panelControl) {
        ocultarPanelViaje(ui.panelControl);
    }
    document.body.classList.remove("driver-trip-active");

    if (ui.estadoBox) {
        ui.estadoBox.innerText = "En attente de courses";
    }
}

function actualizarDetalleViaje(viaje, estado) {
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

    detenerWaitingTimer();
    if (!viaje || !estado) {
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

    if (eta) eta.textContent = etaText.valor;
    if (etaLabel) etaLabel.textContent = etaText.label;
    if (distanciaResumen) distanciaResumen.textContent = distanceLabel;
    if (nombre) nombre.textContent = passengerName;
    actualizarAvatarPasajero(avatar, foto, passengerName, passengerPhoto);
    if (rating) rating.innerHTML = `<i class="fa-solid fa-star" aria-hidden="true"></i> ${passengerRating}`;
    if (direccionPrincipal) direccionPrincipal.textContent = limpiarDireccionPrincipal(origenAddress);
    if (direccionDetalle) direccionDetalle.textContent = limpiarDireccionDetalle(origenAddress, detail);
    if (destinoPrincipal) destinoPrincipal.textContent = limpiarDireccionPrincipal(destinoAddress);
    if (destinoDetalle) destinoDetalle.textContent = limpiarDireccionDetalle(destinoAddress, vaDeVuelta ? "Retorno" : "Destino");
    if (tiempo) tiempo.textContent = etaText.valor === "--" ? "--" : etaText.valor;
    if (distancia) distancia.textContent = distanceLabel;
    if (etapa) etapa.textContent = obtenerEtapaLabel(viaje, estado);
    if (tipoServicio) tipoServicio.textContent = serviceLabel;
    if (metodoPago) metodoPago.textContent = formatearMetodoPago(money.metodoPago);
    if (tarifa) tarifa.textContent = formatGourdes(money.totalCobrar || money.precio || viaje.precio || 0);

    waitingCard?.classList.toggle("hidden", estado !== "llego");
    completedCard?.classList.toggle("hidden", !["completado", "finalizado"].includes(estado));

    if (estado === "llego" && waitingTimer) {
        iniciarWaitingTimer(waitingTimer, viaje);
    }

    if (gananciaFinal) {
        gananciaFinal.textContent = formatGourdes(money.gananciaMotorista || money.totalMotorista || viaje.gananciaMotorista || viaje.precio || 0);
    }
}

function actualizarResumenReserva() {
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
        foto.src = photoUrl;
        foto.hidden = false;
    } else {
        foto.removeAttribute("src");
        foto.hidden = true;
    }
}

function mostrarPanelViaje(panel) {
    if (!panel) return;
    panel.classList.remove("hidden");
    panel.style.display = "flex";
}

function ocultarPanelViaje(panel) {
    if (!panel) return;
    panel.classList.add("hidden");
    panel.style.display = "none";
}

function iniciarWaitingTimer(node, viaje) {
    const start = Number(viaje?.llegoAt || viaje?.arrivedAt || Date.now());
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
}

function inicializarAccionesViaje() {
    if (botonesAccionInicializados) return;
    botonesAccionInicializados = true;
    inicializarSheetExpandible();
    inicializarActualizacionGpsPanel();

    document.getElementById("btnViajeLlamar")?.addEventListener("click", () => {
        const viaje = obtenerViajeActualUI();
        const pasajero = typeof viaje?.pasajero === "object" ? viaje.pasajero : {};
        const tel = pasajero.telefono || pasajero.phone || viaje?.telefonoPasajero || viaje?.pasajeroTelefono;
        if (tel) window.location.href = `tel:${tel}`;
    });

}

function inicializarActualizacionGpsPanel() {
    if (gpsUiListenerInicializado) return;
    gpsUiListenerInicializado = true;

    window.addEventListener("driver:gps-position", () => {
        const estado = getEstadoViaje();
        const viaje = obtenerViajeActualUI();
        if (!estado || !viaje) return;
        actualizarDetalleViaje(viaje, estado);
    });
}

function inicializarSheetExpandible() {
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

function obtenerViajeActualUI() {
    const viajeId = getViajeEnCursoId();
    if (viajeId && viajesActivos.has(String(viajeId))) {
        return viajesActivos.get(String(viajeId));
    }

    if (viajeId && viajesActivos.has(viajeId)) {
        return viajesActivos.get(viajeId);
    }

    const activo = Array.from(viajesActivos.values()).find(viaje =>
        ["asignado", "llego", "en_curso"].includes(viaje?.estado)
    );
    if (activo) return activo;

    const reservado = obtenerViajeReservadoUI();
    if (reservado && getEstadoViaje() === "reservado") return reservado;

    return null;
}

function obtenerViajeReservadoUI() {
    const reservadoId = getViajeReservadoId();
    if (reservadoId && viajesActivos.has(String(reservadoId))) {
        return viajesActivos.get(String(reservadoId));
    }

    if (reservadoId && viajesActivos.has(reservadoId)) {
        return viajesActivos.get(reservadoId);
    }

    return Array.from(viajesActivos.values()).find(viaje =>
        viaje?.estado === "reservado" || viaje?.esReserva === true || viaje?.tipo === "reserva"
    ) || null;
}

function actualizarBotonCobro(viaje, estado) {
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
