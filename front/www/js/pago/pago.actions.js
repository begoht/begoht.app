import { viajeState } from "../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js?v=20260605-price-modal-fix";
import { mostrarPagoNoDisponible } from "../pasajero/ui/modales/pagoNoDisponible.ui.js?v=20260605-payments-premium";

const METODOS_PAGO_NO_DISPONIBLES = new Set(["moncash", "natcash"]);

export function seleccionarPago(tipo, boton) {
  const metodoNormalizado = String(tipo || "").toLowerCase();

  if (METODOS_PAGO_NO_DISPONIBLES.has(metodoNormalizado)) {
    mostrarPagoNoDisponible({ metodo: metodoNormalizado });
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
