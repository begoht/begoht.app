import { getSocket } from "../../../socket/socket.js?v=20260713-passenger-connection-hotfix";
import { eliminarMotoristaDelMapa } from "../../../map/map.motorista.js?v=20260711-car-route-center";
import { viajeState } from "../../../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../boton/botonViaje.ui.js?v=20260628-dark-route-locked";
import {
  CANDIDATE_FALLBACK_MS,
  CANDIDATE_TIMER_GRACE_MS,
  CANCEL_CONFIRMATION_TIMEOUT_MS,
  EMPTY_AUTOCLOSE_MS
} from "./buscandoMotorista.config.js";
import { ensureSearchMapVisible, focusMotoristaOnMap } from "./buscandoMotorista.map.js";
import { buildSearchModal } from "./buscandoMotorista.template.js";
import {
  normalizeMotorista,
  resetCancelButton,
  setCandidateState,
  setSearchingState,
  setStillSearchingState,
  setText
} from "./buscandoMotorista.viewState.js";

function stopCandidateTimer(modal) {
  if (!modal?.candidateTimer) return;
  window.clearTimeout(modal.candidateTimer);
  modal.candidateTimer = null;
}

function startCandidateTimer(modal, ttl) {
  stopCandidateTimer(modal);

  const waitMs =
    Math.max(8_000, Math.min(Number(ttl || CANDIDATE_FALLBACK_MS), 18_000)) +
    CANDIDATE_TIMER_GRACE_MS;

  modal.candidateTimer = window.setTimeout(() => {
    setStillSearchingState(modal);
  }, waitMs);
}

function limpiarEstadoBusquedaCancelada() {
  Object.assign(viajeState, {
    activo: false,
    buscando: false,
    asignado: false,
    enCurso: false,
    llego: false,
    cancelado: false,
    precioConfirmado: false,
    viajeId: null,
    motorista: null,
    proximoDestino: null,
    estado: null
  });

  localStorage.removeItem("viajeActivo");
  sessionStorage.removeItem("viajeActivo");
}

function bindCancelSearch(modal) {
  modal.querySelector("#cancelarBusqueda")?.addEventListener("click", (event) => {
    const btn = event.currentTarget;
    if (btn?.dataset.cancelando === "true") return;

    const viajeId = viajeState.viajeId;
    const socket = getSocket();

    if (!viajeId || !socket?.connected) {
      setText(modal, "#busquedaHint", "Connexion indisponible. Réessayez dans quelques secondes.");
      resetCancelButton(btn);
      return;
    }

    btn.dataset.cancelando = "true";
    btn.disabled = true;
    btn.innerHTML = [
      "<span>Annulation...</span>",
      "<span class='bego-search__button-arrow' aria-hidden='true'>",
      "<i class='fa-solid fa-spinner fa-spin'></i>",
      "</span>"
    ].join("");

    let settled = false;
    let timeoutId = null;

    const cleanupListeners = () => {
      socket.off?.("viaje:cancelado", onCancelado);
      socket.off?.("error", onError);
      socket.off?.("disconnect", onDisconnect);
      if (timeoutId) window.clearTimeout(timeoutId);
    };

    const failCancel = (message) => {
      if (settled) return;
      settled = true;
      cleanupListeners();
      setText(modal, "#busquedaHint", message);
      resetCancelButton(btn);
    };

    const completeCancel = () => {
      if (settled) return;
      settled = true;
      cleanupListeners();
      limpiarEstadoBusquedaCancelada();
      cerrarBuscandoMotorista();
      actualizarBotonViaje();
    };

    function onCancelado(data = {}) {
      const idRecibido = data?.viajeId || data?.id;
      if (idRecibido && String(idRecibido) !== String(viajeId)) return;
      completeCancel();
    }

    function onError(error = {}) {
      failCancel(error?.mensaje || "Impossible d'annuler pour le moment. Réessayez.");
    }

    function onDisconnect() {
      failCancel("Connexion perdue. Réessayez dans quelques secondes.");
    }

    socket.on?.("viaje:cancelado", onCancelado);
    socket.on?.("error", onError);
    socket.on?.("disconnect", onDisconnect);

    timeoutId = window.setTimeout(() => {
      failCancel("Annulation non confirmée. Vérifiez votre connexion et réessayez.");
    }, CANCEL_CONFIRMATION_TIMEOUT_MS);

    socket.emit("cancelar-viaje", { viajeId });
  });
}

function startSearchClock(modal) {
  let segundos = 0;

  modal.intervaloTiempo = window.setInterval(() => {
    segundos += 1;
    const min = String(Math.floor(segundos / 60)).padStart(2, "0");
    const sec = String(segundos % 60).padStart(2, "0");
    setText(modal, "#contadorBusqueda", min + ":" + sec);
  }, 1000);
}

export function mostrarBuscandoMotorista(force = false) {
  if (!force && !viajeState.precioConfirmado) return;

  ensureSearchMapVisible();

  const modalExistente = document.getElementById("buscandoMotorista");
  if (modalExistente) {
    if (modalExistente.dataset.state === "searching") {
      setSearchingState(modalExistente);
    }

    viajeState.buscando = true;
    actualizarBotonViaje();
    return;
  }

  const modal = buildSearchModal();
  document.body.appendChild(modal);

  setSearchingState(modal);
  viajeState.buscando = true;
  actualizarBotonViaje();

  startSearchClock(modal);
  bindCancelSearch(modal);
}

export function cerrarBuscandoMotorista() {
  const modal = document.getElementById("buscandoMotorista");
  if (!modal) return;

  if (modal.intervaloTiempo) {
    window.clearInterval(modal.intervaloTiempo);
  }

  stopCandidateTimer(modal);
  modal.remove();
}

export function actualizarMotoristaCandidato(motorista = {}, options = {}) {
  let modal = document.getElementById("buscandoMotorista");

  if (!modal) {
    mostrarBuscandoMotorista(true);
    modal = document.getElementById("buscandoMotorista");
  }

  if (!modal) return;

  const normalized = normalizeMotorista(motorista) || motorista;
  setCandidateState(modal, normalized);
  focusMotoristaOnMap(normalized);
  startCandidateTimer(modal, options.ttl);
}

export function mostrarBusquedaSinMotorista(data = {}) {
  cerrarBuscandoMotorista();
  eliminarMotoristaDelMapa();
  ensureSearchMapVisible();

  const modal = buildSearchModal();
  modal.dataset.state = "empty";
  document.body.appendChild(modal);

  const mensaje =
    data.mensaje ||
    data.message ||
    "Aucun motorista disponible pour le moment. Vous pouvez modifier le point de départ ou réessayer.";

  setText(modal, "#busquedaEyebrow", "RECHERCHE TERMINÉE");
  setText(modal, "#busquedaTitle", "Aucun chauffeur");
  setText(modal, "#textoBusqueda", mensaje);
  setText(modal, "#motoristaCandidato", "Indisponible");
  setText(modal, "#busquedaHint", "La demande n'a pas été créée comme course active.");

  modal.querySelector("#cerrarSinMotorista")?.addEventListener("click", () => {
    cerrarBuscandoMotorista();
    actualizarBotonViaje();
  });

  window.setTimeout(() => {
    if (document.getElementById("buscandoMotorista") === modal) {
      cerrarBuscandoMotorista();
      actualizarBotonViaje();
    }
  }, EMPTY_AUTOCLOSE_MS);
}
