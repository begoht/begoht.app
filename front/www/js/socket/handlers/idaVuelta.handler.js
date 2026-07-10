import { viajeState } from "../../viaje/viaje.state.js";
import { actualizarRutaSegunEstado, resetRutaController } from "../../map/map.route.flow.js?v=20260710-route-camera";
import { mostrarDestinoEnMapa } from "../../map/map.destino.js?v=20260710-route-camera";
import { guardarSesionViaje, actualizarUIDriver } from "../pasajero.utils.js?v=20260710-photo-fix";

const RETORNO_AUTO_START_MS = 10000;
const MODAL_RETORNO_ID = "modalIdaVueltaDecision";

let retornoDecisionTimer = null;
let retornoDecisionViajeId = null;

export function handleIdaVueltaPendiente(data = {}, socket = null) {
  if (!esViajeActual(data)) return;

  aplicarPayload(data);
  mostrarDecisionRetorno(data, socket);
}

export function handleRetornoIniciado(data = {}) {
  if (!esViajeActual(data)) return;

  cerrarDecisionRetorno();
  aplicarPayload(data, "en_curso");
  resetRutaController();

  mostrarDestinoEnMapa(viajeState.proximoDestino || viajeState.origen);
  actualizarRutaSegunEstado({
    estado: "en_curso",
    motorista: viajeState.motorista,
    origen: viajeState.origen,
    destino: viajeState.destino,
    proximoDestino: viajeState.proximoDestino || viajeState.origen || null
  });

  notificar("La vuelta empezo. El motorista va de regreso al origen.");
}

export function handleRetornoAnulado(data = {}) {
  if (!esViajeActual(data)) return;

  cerrarDecisionRetorno();
  aplicarPayload(data);
  if (data.idaVuelta?.precioIda) viajeState.precio = data.idaVuelta.precioIda;
  notificar("La vuelta fue anulada. Se cobrara solo la ida.");
}

function aplicarPayload(data = {}, estado = null) {
  Object.assign(viajeState, {
    viajeId: data.viajeId || viajeState.viajeId,
    estado: estado || data.estado || viajeState.estado,
    origen: data.origen || viajeState.origen,
    destino: data.destino || viajeState.destino,
    proximoDestino: data.proximoDestino || viajeState.proximoDestino || null,
    idaVuelta: data.idaVuelta || viajeState.idaVuelta || null,
    precio: data.precio ?? viajeState.precio,
    precioBase: data.precioBase ?? viajeState.precioBase,
    distanciaKm: data.distanciaKm ?? viajeState.distanciaKm,
    duracionMin: data.duracionMin ?? viajeState.duracionMin,
    metodoPago: data.metodoPago ?? viajeState.metodoPago,
    estadoPago: data.estadoPago ?? viajeState.estadoPago,
    activo: true,
    enCurso: (estado || data.estado || viajeState.estado) === "en_curso"
  });

  guardarSesionViaje(viajeState.estado || "en_curso");
  actualizarUIDriver(viajeState.motorista, viajeState.estado || "en_curso", {
    idaVuelta: viajeState.idaVuelta,
    proximoDestino: viajeState.proximoDestino
  });
}

function esViajeActual(data = {}) {
  if (!data?.viajeId || !viajeState.viajeId) return true;
  return String(data.viajeId) === String(viajeState.viajeId);
}

function cerrarDecisionRetorno() {
  if (retornoDecisionTimer) {
    clearTimeout(retornoDecisionTimer);
    retornoDecisionTimer = null;
  }

  retornoDecisionViajeId = null;
  document.getElementById(MODAL_RETORNO_ID)?.remove();
}

function mostrarDecisionRetorno(data = {}, socket = null) {
  if (!document.body) {
    iniciarRetornoAutomatico(socket, data.viajeId || viajeState.viajeId);
    return;
  }

  const viajeId = data.viajeId || viajeState.viajeId;
  if (!viajeId) return;

  cerrarDecisionRetorno();
  retornoDecisionViajeId = String(viajeId);

  const modal = document.createElement("div");
  modal.id = MODAL_RETORNO_ID;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      z-index:99999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:18px;
      background:rgba(15,23,42,.66);
      backdrop-filter:blur(10px);
    ">
      <div style="
        width:min(92vw,390px);
        border-radius:22px;
        background:#ffffff;
        color:#0f172a;
        box-shadow:0 24px 70px rgba(2,6,23,.38);
        padding:24px;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        text-align:center;
      ">
        <div style="font-size:13px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">
          Ida finalizada
        </div>
        <div style="margin-top:10px;font-size:22px;font-weight:950;line-height:1.18;">
          La vuelta esta lista
        </div>
        <div style="margin-top:12px;font-size:14px;font-weight:750;line-height:1.45;color:#475569;">
          Si ya no quieres regresar, puedes anular la vuelta ahora. Si no, el regreso empieza automaticamente.
        </div>
        <button id="btnAnularVueltaPasajero" type="button" style="
          width:100%;
          margin-top:22px;
          border:0;
          border-radius:16px;
          background:#dc2626;
          color:white;
          font-weight:950;
          font-size:16px;
          padding:15px 18px;
          cursor:pointer;
        ">
          Anular vuelta
        </button>
        <div id="idaVueltaDecisionStatus" style="margin-top:12px;font-size:12px;font-weight:800;color:#64748b;">
          El regreso comenzara en unos segundos.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("btnAnularVueltaPasajero")?.addEventListener("click", () => {
    const btn = document.getElementById("btnAnularVueltaPasajero");
    const status = document.getElementById("idaVueltaDecisionStatus");

    if (retornoDecisionTimer) {
      clearTimeout(retornoDecisionTimer);
      retornoDecisionTimer = null;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Anulando...";
      btn.style.opacity = "0.74";
      btn.style.cursor = "wait";
    }

    if (status) {
      status.textContent = "Confirmando anulacion...";
    }

    socket?.emit?.("ida-vuelta:anular-retorno", { viajeId });
  });

  retornoDecisionTimer = setTimeout(() => {
    iniciarRetornoAutomatico(socket, viajeId);
  }, RETORNO_AUTO_START_MS);
}

function iniciarRetornoAutomatico(socket, viajeId) {
  if (!viajeId || (retornoDecisionViajeId && String(viajeId) !== retornoDecisionViajeId)) return;

  const btn = document.getElementById("btnAnularVueltaPasajero");
  const status = document.getElementById("idaVueltaDecisionStatus");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Regreso en curso";
    btn.style.opacity = "0.74";
    btn.style.cursor = "wait";
  }

  if (status) {
    status.textContent = "Iniciando regreso...";
  }

  socket?.emit?.("ida-vuelta:iniciar-retorno", { viajeId });
  retornoDecisionTimer = null;
}

function notificar(text) {
  if (typeof Toastify === "function") {
    Toastify({
      text,
      duration: 4200,
      gravity: "top",
      position: "center",
      style: {
        background: "linear-gradient(135deg, #2563eb, #0891b2)",
        color: "#fff",
        fontWeight: "900",
        borderRadius: "12px"
      }
    }).showToast();
    return;
  }

  console.log(text);
}

