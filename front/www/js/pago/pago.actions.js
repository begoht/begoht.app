import { viajeState } from "../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../viaje/viaje.ui.js";

export function seleccionarPago(tipo, boton) {
  viajeState.metodoPago = tipo;

  document
    .querySelectorAll(".btn-pago")
    .forEach((b) => b.classList.remove("activo"));

  boton?.classList.add("activo");

  console.log("💳 Método de pago seleccionado:", tipo);

  actualizarBotonViaje(); // 🔥 CLAVE
}
