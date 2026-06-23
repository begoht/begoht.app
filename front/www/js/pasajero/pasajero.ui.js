// js/pasajero/pasajero.ui.js
import { viajeState } from "../viaje/viaje.state.js";
import { getServerUrl } from "../conexion.js";
import { actualizarBotonViaje } from "./ui/boton/botonViaje.ui.js?v=20260623-roundtrip";
import { mostrarPagoNoDisponible } from "./ui/modales/pagoNoDisponible.ui.js?v=20260606-payment-methods";

export { actualizarBotonViaje };

export {
  mostrarBuscandoMotorista,
  cerrarBuscandoMotorista,
  actualizarMotoristaCandidato,
  mostrarBusquedaSinMotorista
} from "./ui/overlays/buscandoMotorista.ui.js?v=20260608-search-modal";

export { mostrarModalConfirmacion } from "./ui/modales/modalConfirmacion.ui.js";
export { mostrarModalPrecio } from "./ui/modales/modalPrecio.ui.js?v=20260623-roundtrip";
export { mostrarModalConfirmarCancelacion } from "./ui/modales/modalCancelacion.ui.js";

export {
  mostrarNotificacionLlegada,
  actualizarEstadoLlegada,
  mostrarNotificacionProximidad,
  actualizarEstadoProximidad,
  reproducirSonidoLlegada
} from "./ui/notificaciones/llegada.ui.js";

export { initToggleMenuDriver } from "./ui/menu/menu.ui.js";

const DEFAULT_PAYMENT_METHODS = {
  efectivo: { id: "efectivo", label: "Efectivo", enabled: true, canPay: true },
  wallet: { id: "wallet", label: "Wallet BeGO", enabled: true, canPay: true },
  moncash: { id: "moncash", label: "MonCash", enabled: false, canPay: false },
  natcash: { id: "natcash", label: "NatCash", enabled: false, canPay: false }
};

let paymentMethods = { ...DEFAULT_PAYMENT_METHODS };

function normalizePaymentMethods(data = {}) {
  return {
    ...DEFAULT_PAYMENT_METHODS,
    ...(data.methods || {})
  };
}

function getPaymentMethodConfig(metodo) {
  return paymentMethods[String(metodo || "").toLowerCase()] || null;
}

function paymentMethodCanPay(metodo) {
  const config = getPaymentMethodConfig(metodo);
  return Boolean(config?.enabled && config?.canPay);
}

function firstAvailablePaymentMethod() {
  return ["efectivo", "wallet", "moncash", "natcash"].find(paymentMethodCanPay) || null;
}

function applyPaymentMethodButtons() {
  if (!viajeState.metodoPago || !paymentMethodCanPay(viajeState.metodoPago)) {
    viajeState.metodoPago = firstAvailablePaymentMethod();
  }

  document.querySelectorAll("[data-payment-method]").forEach((button) => {
    const method = button.dataset.paymentMethod;
    const config = getPaymentMethodConfig(method);
    const available = paymentMethodCanPay(method);

    button.classList.toggle("btn-pago-indisponible", !available);
    button.setAttribute("aria-disabled", available ? "false" : "true");
    button.title = available
      ? `${config?.label || method} disponible`
      : (config?.unavailableMessage || `${config?.label || method} no disponible por ahora.`);

    if (!available && viajeState.metodoPago === method) {
      viajeState.metodoPago = null;
    }

    button.classList.toggle("activo", available && viajeState.metodoPago === method);
  });

  actualizarBotonViaje();
}

export async function initPaymentMethodSettings() {
  try {
    const res = await fetch(`${getServerUrl()}/api/payment-method-settings`, {
      headers: { "ngrok-skip-browser-warning": "true" },
      cache: "no-store"
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    paymentMethods = normalizePaymentMethods(data);
  } catch (err) {
    console.warn("No se pudo cargar metodos de pago:", err);
    paymentMethods = { ...DEFAULT_PAYMENT_METHODS };
  }

  window.__begoPaymentMethods = paymentMethods;
  applyPaymentMethodButtons();
}

export function animarMotoristaEncontrado() {
  const box = document.getElementById("boxBusqueda");
  if (!box) return;

  box.innerHTML = `
    <div class="busqueda-status">
      <div style="font-size:34px; line-height:1;">Moto</div>
      <div>
        <h3 style="margin:0;">Motorista encontrado</h3>
        <p style="color:#4ade80; margin:4px 0 0;">Conectando contigo...</p>
      </div>
    </div>
  `;

  box.style.transition = "all 0.3s ease";
  box.style.transform = "scale(1.08)";
  box.style.opacity = "1";
}

export function seleccionarPago(metodo, elemento) {
  const metodoNormalizado = String(metodo || "").toLowerCase();
  const config = getPaymentMethodConfig(metodoNormalizado);

  if (!paymentMethodCanPay(metodoNormalizado)) {
    console.log("Metodo de pago no disponible:", metodoNormalizado);
    mostrarPagoNoDisponible({
      metodo: metodoNormalizado,
      mensaje: config?.unavailableMessage
    });
    applyPaymentMethodButtons();
    return;
  }

  console.log("Metodo de pago seleccionado:", metodoNormalizado);
  viajeState.metodoPago = metodoNormalizado;

  document.querySelectorAll(".btn-pago").forEach((btn) => {
    btn.classList.remove("activo");
  });

  elemento?.classList.add("activo");
  actualizarBotonViaje();
}
