import { getSocket } from "../../../socket/socket.js?v=20260606-session-refresh";
import { getMapaInstance } from "../../../map/state/map.motoristas.state.js";
import {
  eliminarMotoristaDelMapa,
  mostrarMotoristaEnMapa
} from "../../../map/map.motorista.js?v=20260627-map-rotate";
import { viajeState } from "../../../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../boton/botonViaje.ui.js?v=20260627-map-rotate";

const CANDIDATE_FALLBACK_MS = 14_000;

function ensureMapVisible() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  mapEl.classList.remove("hidden");
  mapEl.style.display = "block";

  window.setTimeout(() => {
    window.map?.invalidateSize?.();
    getMapaInstance()?.invalidateSize?.();
  }, 120);
}

function normalizeMotorista(motorista = {}) {
  const lat =
    motorista.lat ??
    motorista.latitude ??
    motorista.ubicacion?.lat ??
    motorista.ubicacionActual?.lat ??
    motorista.location?.lat;

  const lng =
    motorista.lng ??
    motorista.lon ??
    motorista.longitude ??
    motorista.ubicacion?.lng ??
    motorista.ubicacionActual?.lng ??
    motorista.location?.lng;

  const normalized = {
    ...motorista,
    lat: Number(lat),
    lng: Number(lng),
    nombre: motorista.nombre || motorista.fullName || "Motorista BeGO"
  };

  if (!Number.isFinite(normalized.lat) || !Number.isFinite(normalized.lng)) {
    return null;
  }

  return normalized;
}

function setText(modal, selector, value) {
  const el = modal?.querySelector(selector);
  if (el) el.textContent = value;
}

function setSearchingState(modal) {
  modal.dataset.state = "searching";
  setText(modal, "#busquedaTitle", "Recherche de motorista");
  setText(modal, "#textoBusqueda", "Nous contactons les motoristas les plus proches.");
  setText(modal, "#motoristaCandidato", "En attente");
  setText(modal, "#busquedaStep", "Recherche active");
  setText(modal, "#busquedaHint", "La carte reste ouverte pendant la recherche.");
}

function setCandidateState(modal, motorista = {}) {
  const nombre = motorista.nombre || "Motorista proche";

  modal.dataset.state = "candidate";
  setText(modal, "#busquedaTitle", "Motorista trouve");
  setText(modal, "#textoBusqueda", `${nombre} recoit votre offre. Si la reponse expire, BeGO continue automatiquement.`);
  setText(modal, "#motoristaCandidato", nombre);
  setText(modal, "#busquedaStep", "Verification");
  setText(modal, "#busquedaHint", "Zoom sur le motorista pendant la confirmation.");

  modal.querySelector("#boxBusqueda")?.animate(
    [
      { transform: "translateY(0) scale(1)", boxShadow: "0 24px 70px rgba(15, 23, 42, 0.32)" },
      { transform: "translateY(-2px) scale(1.012)", boxShadow: "0 24px 80px rgba(37, 99, 235, 0.28)" },
      { transform: "translateY(0) scale(1)", boxShadow: "0 24px 70px rgba(15, 23, 42, 0.32)" }
    ],
    { duration: 620, easing: "ease-out" }
  );
}

function setStillSearchingState(modal) {
  if (!modal || modal.dataset.state !== "candidate") return;

  modal.dataset.state = "searching";
  setText(modal, "#busquedaTitle", "Recherche en cours");
  setText(modal, "#textoBusqueda", "Ce motorista n'a pas accepte a temps. BeGO cherche une autre option.");
  setText(modal, "#motoristaCandidato", "Nouvelle option");
  setText(modal, "#busquedaStep", "Recherche active");
  setText(modal, "#busquedaHint", "Nous gardons la demande ouverte.");
}

function focusMotoristaOnMap(motorista = {}) {
  const normalized = normalizeMotorista(motorista);
  if (!normalized) return;

  ensureMapVisible();
  mostrarMotoristaEnMapa(normalized);

  window.setTimeout(() => {
    const map = getMapaInstance() || window.map;
    if (!map?.flyTo) return;

    const currentZoom = Number(map.getZoom?.() || 14);
    map.flyTo([normalized.lat, normalized.lng], Math.max(currentZoom, 17), {
      animate: true,
      duration: 0.85
    });
  }, 180);
}

function stopCandidateTimer(modal) {
  if (modal?.candidateTimer) {
    window.clearTimeout(modal.candidateTimer);
    modal.candidateTimer = null;
  }
}

function startCandidateTimer(modal, ttl) {
  stopCandidateTimer(modal);
  const waitMs = Math.max(8_000, Math.min(Number(ttl || CANDIDATE_FALLBACK_MS), 18_000)) + 700;
  modal.candidateTimer = window.setTimeout(() => setStillSearchingState(modal), waitMs);
}

function buildSearchModal() {
  const modal = document.createElement("div");
  modal.id = "buscandoMotorista";
  modal.dataset.state = "searching";

  modal.innerHTML = `
    <div class="busqueda-shell" role="dialog" aria-live="polite" aria-label="Recherche de motorista">
      <div id="boxBusqueda" class="busqueda-card">
        <div class="busqueda-map-chip">
          <i class="fa-solid fa-map-location-dot"></i>
          <span id="busquedaStep">Recherche active</span>
        </div>

        <div class="busqueda-status">
          <div class="search-radar" aria-hidden="true">
            <span class="radar-wave wave-a"></span>
            <span class="radar-wave wave-b"></span>
            <span class="radar-core">
              <i class="fa-solid fa-motorcycle"></i>
            </span>
          </div>

          <div class="status-content">
            <h3 id="busquedaTitle">Recherche de motorista</h3>
            <p id="textoBusqueda">Nous contactons les motoristas les plus proches.</p>
          </div>
        </div>

        <div class="busqueda-track">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div class="busqueda-meta">
          <div class="meta-item">
            <small>Temps</small>
            <strong id="contadorBusqueda">00:00</strong>
          </div>
          <div class="meta-item">
            <small>Motorista</small>
            <strong id="motoristaCandidato">En attente</strong>
          </div>
        </div>

        <div class="busqueda-hint">
          <i class="fa-solid fa-location-crosshairs"></i>
          <span id="busquedaHint">La carte reste ouverte pendant la recherche.</span>
        </div>

        <button id="cancelarBusqueda" type="button">
          <i class="fa-solid fa-xmark"></i>
          <span>Annuler la recherche</span>
        </button>
      </div>
    </div>

    <style>
      #buscandoMotorista {
        position: fixed;
        inset: 0;
        z-index: 99999;
        pointer-events: none;
      }

      #buscandoMotorista .busqueda-shell {
        position: absolute;
        left: 0;
        right: 0;
        bottom: max(86px, env(safe-area-inset-bottom));
        display: flex;
        justify-content: center;
        padding: 0 14px;
        pointer-events: none;
      }

      #buscandoMotorista .busqueda-card {
        width: min(430px, 100%);
        position: relative;
        overflow: hidden;
        pointer-events: auto;
        border-radius: 26px;
        border: 1px solid rgba(255, 255, 255, 0.72);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94)),
          radial-gradient(circle at 18% 0%, rgba(37, 99, 235, 0.12), transparent 36%);
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.32);
        padding: 16px;
        color: #0f172a;
        animation: begoSearchIn 0.28s ease-out;
      }

      #buscandoMotorista .busqueda-card::before {
        content: "";
        position: absolute;
        left: 18px;
        right: 18px;
        top: 0;
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, #2563eb, #22c55e, #0ea5e9);
      }

      #buscandoMotorista .busqueda-map-chip {
        width: max-content;
        max-width: 100%;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 30px;
        padding: 7px 11px;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.09);
        color: #1d4ed8;
        font-size: 12px;
        font-weight: 800;
      }

      #buscandoMotorista .busqueda-status {
        margin-top: 12px;
        display: grid;
        grid-template-columns: 66px minmax(0, 1fr);
        gap: 14px;
        align-items: center;
      }

      #buscandoMotorista .search-radar {
        width: 66px;
        height: 66px;
        position: relative;
        display: grid;
        place-items: center;
      }

      #buscandoMotorista .radar-wave,
      #buscandoMotorista .radar-core {
        position: absolute;
        border-radius: 50%;
      }

      #buscandoMotorista .radar-wave {
        inset: 5px;
        border: 1px solid rgba(37, 99, 235, 0.24);
        animation: begoRadar 1.7s ease-out infinite;
      }

      #buscandoMotorista .wave-b {
        animation-delay: 0.55s;
      }

      #buscandoMotorista .radar-core {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #2563eb, #0f172a);
        color: #ffffff;
        box-shadow: 0 14px 30px rgba(37, 99, 235, 0.28);
      }

      #buscandoMotorista[data-state="candidate"] .radar-core {
        background: linear-gradient(135deg, #22c55e, #15803d);
        box-shadow: 0 14px 30px rgba(34, 197, 94, 0.30);
      }

      #buscandoMotorista[data-state="empty"] .radar-core {
        background: linear-gradient(135deg, #f97316, #dc2626);
        box-shadow: 0 14px 30px rgba(249, 115, 22, 0.26);
      }

      #buscandoMotorista h3 {
        margin: 0;
        color: #0f172a;
        font-size: 18px;
        line-height: 1.15;
        font-weight: 900;
        letter-spacing: 0;
      }

      #buscandoMotorista p {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 13px;
        line-height: 1.35;
      }

      #buscandoMotorista .busqueda-track {
        margin: 15px 0 12px;
        height: 5px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }

      #buscandoMotorista .busqueda-track span {
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.16);
        overflow: hidden;
        position: relative;
      }

      #buscandoMotorista .busqueda-track span::after {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(90deg, #2563eb, #22c55e);
        animation: begoTrack 1.6s ease-in-out infinite;
      }

      #buscandoMotorista .busqueda-track span:nth-child(2)::after {
        animation-delay: 0.2s;
      }

      #buscandoMotorista .busqueda-track span:nth-child(3)::after {
        animation-delay: 0.4s;
      }

      #buscandoMotorista[data-state="empty"] .busqueda-track span::after {
        animation: none;
        transform: translateX(0);
        background: #f97316;
      }

      #buscandoMotorista .busqueda-meta {
        display: grid;
        grid-template-columns: 0.72fr 1.28fr;
        gap: 10px;
      }

      #buscandoMotorista .meta-item {
        min-width: 0;
        border-radius: 18px;
        background: #f1f5f9;
        border: 1px solid rgba(148, 163, 184, 0.20);
        padding: 11px 12px;
      }

      #buscandoMotorista .meta-item small {
        display: block;
        margin-bottom: 3px;
        color: #64748b;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0;
      }

      #buscandoMotorista .meta-item strong {
        display: block;
        min-width: 0;
        color: #0f172a;
        font-size: 15px;
        line-height: 1.15;
        font-weight: 900;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #buscandoMotorista #contadorBusqueda {
        color: #2563eb;
        font-variant-numeric: tabular-nums;
      }

      #buscandoMotorista .busqueda-hint {
        margin-top: 12px;
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        gap: 8px;
        align-items: start;
        color: #475569;
        font-size: 12px;
        line-height: 1.32;
      }

      #buscandoMotorista .busqueda-hint i {
        margin-top: 1px;
        color: #2563eb;
      }

      #buscandoMotorista #cancelarBusqueda,
      #buscandoMotorista #cerrarSinMotorista {
        margin-top: 14px;
        width: 100%;
        min-height: 46px;
        border: 0;
        border-radius: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        background: #0f172a;
        color: #ffffff;
        font-weight: 900;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 14px 26px rgba(15, 23, 42, 0.20);
      }

      #buscandoMotorista #cancelarBusqueda:disabled {
        opacity: 0.68;
        cursor: wait;
      }

      #buscandoMotorista[data-state="empty"] #cancelarBusqueda {
        display: none;
      }

      #buscandoMotorista #cerrarSinMotorista {
        display: none;
        background: linear-gradient(135deg, #2563eb, #0f172a);
      }

      #buscandoMotorista[data-state="empty"] #cerrarSinMotorista {
        display: inline-flex;
      }

      @media (max-width: 420px) {
        #buscandoMotorista .busqueda-shell {
          padding: 0 10px;
        }

        #buscandoMotorista .busqueda-card {
          border-radius: 22px;
          padding: 14px;
        }

        #buscandoMotorista .busqueda-status {
          grid-template-columns: 58px minmax(0, 1fr);
          gap: 12px;
        }

        #buscandoMotorista .search-radar {
          width: 58px;
          height: 58px;
        }

        #buscandoMotorista .radar-core {
          width: 38px;
          height: 38px;
        }
      }

      @keyframes begoSearchIn {
        from {
          opacity: 0;
          transform: translateY(16px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes begoRadar {
        0% {
          opacity: 0.72;
          transform: scale(0.72);
        }
        100% {
          opacity: 0;
          transform: scale(1.28);
        }
      }

      @keyframes begoTrack {
        0% {
          transform: translateX(-100%);
        }
        52% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(100%);
        }
      }
    </style>
  `;

  const closeButton = document.createElement("button");
  closeButton.id = "cerrarSinMotorista";
  closeButton.type = "button";
  closeButton.innerHTML = `<i class="fa-solid fa-check"></i><span>Compris</span>`;
  modal.querySelector("#boxBusqueda")?.appendChild(closeButton);

  return modal;
}

export function mostrarBuscandoMotorista(force = false) {
  if (!force && !viajeState.precioConfirmado) return;

  cerrarBuscandoMotorista();
  ensureMapVisible();

  const modal = buildSearchModal();
  document.body.appendChild(modal);
  setSearchingState(modal);

  viajeState.buscando = true;
  actualizarBotonViaje();

  let segundos = 0;
  modal.intervaloTiempo = window.setInterval(() => {
    segundos += 1;
    const min = String(Math.floor(segundos / 60)).padStart(2, "0");
    const sec = String(segundos % 60).padStart(2, "0");
    setText(modal, "#contadorBusqueda", `${min}:${sec}`);
  }, 1000);

  modal.querySelector("#cancelarBusqueda")?.addEventListener("click", (event) => {
    const btn = event.currentTarget;
    if (btn?.dataset.cancelando === "true") return;

    btn.dataset.cancelando = "true";
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Annulation...</span>`;

    const socket = getSocket();
    if (viajeState.viajeId && socket) {
      socket.emit("cancelar-viaje", { viajeId: viajeState.viajeId });
    }

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

    cerrarBuscandoMotorista();
    actualizarBotonViaje();
  });
}

export function cerrarBuscandoMotorista() {
  const modal = document.getElementById("buscandoMotorista");
  if (!modal) return;

  if (modal.intervaloTiempo) window.clearInterval(modal.intervaloTiempo);
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
  ensureMapVisible();

  const modal = buildSearchModal();
  modal.dataset.state = "empty";
  document.body.appendChild(modal);

  const mensaje =
    data.mensaje ||
    data.message ||
    "Aucun motorista disponible pour le moment. Vous pouvez modifier le point de depart ou reessayer.";

  setText(modal, "#busquedaTitle", "Aucun motorista trouve");
  setText(modal, "#textoBusqueda", mensaje);
  setText(modal, "#motoristaCandidato", "Indisponible");
  setText(modal, "#busquedaStep", "Recherche terminee");
  setText(modal, "#busquedaHint", "La demande n'a pas ete creee comme course active.");

  modal.querySelector("#cerrarSinMotorista")?.addEventListener("click", () => {
    cerrarBuscandoMotorista();
    actualizarBotonViaje();
  });

  window.setTimeout(() => {
    if (document.getElementById("buscandoMotorista") === modal) {
      cerrarBuscandoMotorista();
      actualizarBotonViaje();
    }
  }, 9000);
}
