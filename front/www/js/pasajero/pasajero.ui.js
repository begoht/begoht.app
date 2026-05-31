// js/pasajero/pasajero.ui.js
import { viajeState } from "../viaje/viaje.state.js";
import {pedirViaje, cancelarViaje } from "../viaje/viaje.actions.js";
import { getSocket } from "../socket/socket.js";

// 🔘 BOTÓN
import { actualizarBotonViaje } from "./ui/boton/botonViaje.ui.js";
export { actualizarBotonViaje };

// 🚖 OVERLAY / BUSQUEDA
export { 
  mostrarBuscandoMotorista, 
  cerrarBuscandoMotorista,
  actualizarMotoristaCandidato
} from "./ui/overlays/buscandoMotorista.ui.js";

// 💳 MODALES
export { mostrarModalConfirmacion } from "./ui/modales/modalConfirmacion.ui.js";
export { mostrarModalPrecio } from "./ui/modales/modalPrecio.ui.js";
export { mostrarModalConfirmarCancelacion } from "./ui/modales/modalCancelacion.ui.js";

// 🔔 NOTIFICACIONES
export { 
  mostrarNotificacionLlegada,
  actualizarEstadoLlegada,
  reproducirSonidoLlegada
} from "./ui/notificaciones/llegada.ui.js";

// 🍔 MENU
export { initToggleMenuDriver } from "./ui/menu/menu.ui.js";

// 🧠 ACCIONES LOCALES
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

/*************************************************
 * 🛠️ GESTIÓN DE PAGO
 *************************************************/
export function seleccionarPago(metodo, elemento) {
    console.log("💳 Método de pago seleccionado:", metodo);
    
    viajeState.metodoPago = metodo;

    document.querySelectorAll('.btn-pago').forEach(btn => {
        btn.classList.remove('activo');
    });
    
    if (elemento) {
        elemento.classList.add('activo');
    }

    // Actualizamos el botón para que se ponga verde si ya hay origen/destino
    actualizarBotonViaje();
}
