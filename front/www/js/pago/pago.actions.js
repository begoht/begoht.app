import { viajeState } from "../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js?v=20260627-map-fluid-arrival";
import { mostrarPagoNoDisponible } from "../pasajero/ui/modales/pagoNoDisponible.ui.js?v=20260606-payment-methods";

const DEFAULT_PAYMENT_METHODS = {
  efectivo: { enabled: true, canPay: true },
  wallet: { enabled: true, canPay: true },
  moncash: { enabled: false, canPay: false, unavailableMessage: "MonCash no disponible por ahora." },
  natcash: { enabled: false, canPay: false, unavailableMessage: "NatCash no disponible por ahora." }
};

function getPaymentMethodConfig(metodo) {
  const methods = window.__begoPaymentMethods || DEFAULT_PAYMENT_METHODS;
  return methods[String(metodo || "").toLowerCase()] || null;
}

export function seleccionarPago(tipo, boton) {
  const metodoNormalizado = String(tipo || "").toLowerCase();
  const config = getPaymentMethodConfig(metodoNormalizado);

  if (!config?.enabled || !config?.canPay) {
    mostrarPagoNoDisponible({
      metodo: metodoNormalizado,
      mensaje: config?.unavailableMessage
    });
    return;
  }

  viajeState.metodoPago = metodoNormalizado;

  document
    .querySelectorAll(".btn-pago")
    .forEach((b) => b.classList.remove("activo"));

  boton?.classList.add("activo");

  console.log("Metodo de pago seleccionado:", metodoNormalizado);
  actualizarBotonViaje();
}
