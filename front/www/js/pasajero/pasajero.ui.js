// js/pasajero/pasajero.ui.js
import { viajeState } from "../viaje/viaje.state.js";
import { actualizarBotonViaje } from "./ui/boton/botonViaje.ui.js";
import { mostrarPagoNoDisponible } from "./ui/modales/pagoNoDisponible.ui.js?v=20260604-payments-disabled";

export { actualizarBotonViaje };

export {
  mostrarBuscandoMotorista,
  cerrarBuscandoMotorista,
  actualizarMotoristaCandidato
} from "./ui/overlays/buscandoMotorista.ui.js";

export { mostrarModalConfirmacion } from "./ui/modales/modalConfirmacion.ui.js";
export { mostrarModalPrecio } from "./ui/modales/modalPrecio.ui.js";
export { mostrarModalConfirmarCancelacion } from "./ui/modales/modalCancelacion.ui.js";

export {
  mostrarNotificacionLlegada,
  actualizarEstadoLlegada,
  mostrarNotificacionProximidad,
  actualizarEstadoProximidad,
  reproducirSonidoLlegada
} from "./ui/notificaciones/llegada.ui.js";

export { initToggleMenuDriver } from "./ui/menu/menu.ui.js";

const METODOS_PAGO_NO_DISPONIBLES = new Set(["moncash", "natcash"]);

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

  if (METODOS_PAGO_NO_DISPONIBLES.has(metodoNormalizado)) {
    console.log("Metodo de pago no disponible:", metodoNormalizado);
    mostrarPagoNoDisponible({ metodo: metodoNormalizado });
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
