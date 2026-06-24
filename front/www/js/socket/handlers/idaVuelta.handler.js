import { viajeState } from "../../viaje/viaje.state.js";
import { actualizarRutaSegunEstado, resetRutaController } from "../../map/map.route.flow.js?v=20260623-roundtrip-v2";
import { mostrarDestinoEnMapa } from "../../map/map.destino.js?v=20260624-cordoba-gps";
import { guardarSesionViaje, actualizarUIDriver } from "../pasajero.utils.js?v=20260623-roundtrip-v2";

export function handleIdaVueltaPendiente(data = {}, socket = null) {
  if (!esViajeActual(data)) return;

  aplicarPayload(data);
  mostrarDecisionRetorno(data, socket);
  notificar("Llegaste al destino. Confirma con el motorista si haces la vuelta.");
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

function mostrarDecisionRetorno(data = {}, socket = null) {
  cerrarDecisionRetorno();

  const modal = document.createElement("div");
  modal.id = "modalIdaVueltaDecision";
  modal.innerHTML = `
    <div class="ida-vuelta-overlay">
      <div class="ida-vuelta-card" role="dialog" aria-modal="true" aria-labelledby="idaVueltaTitulo">
        <div class="ida-vuelta-icon"><i class="fa-solid fa-arrows-rotate"></i></div>
        <h2 id="idaVueltaTitulo">Hacer la vuelta?</h2>
        <p>Llegaste al destino. Puedes volver al origen o anular la vuelta y pagar solo la ida.</p>
        <div class="ida-vuelta-actions">
          <button id="btnHacerVuelta" type="button">Hacer vuelta</button>
          <button id="btnAnularVueltaPasajero" type="button">Anular vuelta</button>
        </div>
      </div>
    </div>
    <style>
      .ida-vuelta-overlay {
        position: fixed;
        inset: 0;
        z-index: 10020;
        display: grid;
        place-items: center;
        padding: 16px;
        background: rgba(2, 6, 23, 0.72);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      .ida-vuelta-card {
        width: min(100%, 360px);
        box-sizing: border-box;
        padding: 20px;
        border-radius: 24px;
        color: #f8fafc;
        background: linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(3, 7, 18, 0.99));
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
      }

      .ida-vuelta-icon {
        width: 58px;
        height: 58px;
        margin: 0 auto 12px;
        display: grid;
        place-items: center;
        border-radius: 20px;
        color: #dbeafe;
        background: rgba(37, 99, 235, 0.22);
      }

      .ida-vuelta-card h2 {
        margin: 0 0 8px;
        font-size: 1.28rem;
        letter-spacing: 0;
      }

      .ida-vuelta-card p {
        margin: 0;
        color: #cbd5e1;
        font-size: 0.9rem;
        line-height: 1.35;
      }

      .ida-vuelta-actions {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }

      .ida-vuelta-actions button {
        min-height: 50px;
        border: 0;
        border-radius: 16px;
        color: #fff;
        font: inherit;
        font-weight: 950;
      }

      #btnHacerVuelta {
        background: linear-gradient(135deg, #2563eb, #0891b2);
      }

      #btnAnularVueltaPasajero {
        background: rgba(30, 41, 59, 0.96);
        border: 1px solid rgba(148, 163, 184, 0.18);
      }
    </style>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#btnHacerVuelta")?.addEventListener("click", () => {
    cerrarDecisionRetorno();
    notificar("Listo. Avise al motorista para iniciar la vuelta.");
  });

  modal.querySelector("#btnAnularVueltaPasajero")?.addEventListener("click", () => {
    const button = modal.querySelector("#btnAnularVueltaPasajero");
    if (button) {
      button.disabled = true;
      button.textContent = "Anulando...";
    }

    socket?.emit?.("ida-vuelta:anular-retorno", {
      viajeId: data.viajeId || viajeState.viajeId
    });
  });
}

function cerrarDecisionRetorno() {
  document.getElementById("modalIdaVueltaDecision")?.remove();
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
