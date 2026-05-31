import { initUI, UI } from "./oferta.ui.js";
import { initSocketEventos } from "./oferta.socket.js";
import { aceptarViaje, rechazarViaje } from "./oferta.actions.js";
import { ofertaState, setSocketRef } from "./oferta.state.js";

export function initOferta(socket) {
    console.log("🛠️ Inicializando módulo de Ofertas...")
  if (ofertaState.initialized) return;
  
  initUI();
  setSocketRef(socket);
  initSocketEventos(socket);

  // Evitar duplicidad de listeners con clonación
  if (UI.btnAceptar) {
    const btnAceptar = UI.btnAceptar.cloneNode(true);
    UI.btnAceptar.replaceWith(btnAceptar);
    UI.btnAceptar = btnAceptar;
    UI.btnAceptar.addEventListener("click", () => aceptarViaje(socket));
  }

  if (UI.btnRechazar) {
    const btnRechazar = UI.btnRechazar.cloneNode(true);
    UI.btnRechazar.replaceWith(btnRechazar);
    UI.btnRechazar = btnRechazar;
    UI.btnRechazar.addEventListener("click", () => rechazarViaje(socket));
  }

  ofertaState.initialized = true;
}