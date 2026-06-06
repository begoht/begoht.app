import { viajeState } from "../viaje/viaje.state.js";

const MAX_PESO_KG = 5;

export function initEnvioPaquete() {
  const busqueda = document.querySelector(".busqueda");
  if (!busqueda || document.getElementById("envioPaquetePanel")) return;

  busqueda.insertAdjacentHTML("beforeend", `
    <section id="envioPaquetePanel" class="envio-panel" aria-label="Tipo de servicio">
      <div class="envio-switch" role="group" aria-label="Seleccionar servicio">
        <button type="button" class="envio-tab active" data-servicio="viaje">
          <i class="fa-solid fa-motorcycle"></i>
          <span>Viaje</span>
        </button>
        <button type="button" class="envio-tab" data-servicio="envio">
          <i class="fa-solid fa-box"></i>
          <span>Envio</span>
        </button>
      </div>

      <div class="envio-form hidden" id="envioForm">
        <div class="envio-weight-row">
          <label for="envioPeso">Peso</label>
          <div class="envio-weight-control">
            <input id="envioPeso" type="number" min="0.1" max="5" step="0.1" value="1" inputmode="decimal">
            <span>kg</span>
          </div>
        </div>
        <input id="envioDescripcion" class="envio-input" type="text" maxlength="160" placeholder="Contenido del paquete">
        <textarea id="envioInstrucciones" class="envio-input envio-textarea" maxlength="220" rows="2" placeholder="Instrucciones para entregar"></textarea>
        <label class="envio-rules-check" for="envioReglas">
          <input id="envioReglas" type="checkbox">
          <span>J'accepte les <a href="#/legal-confianza" data-link>regles des colis</a>: maximum 5 kg, contenu legal et code a la livraison.</span>
        </label>
        <p id="envioMsg" class="envio-msg">Maximo 5 kg</p>
      </div>
    </section>
  `);

  const panel = document.getElementById("envioPaquetePanel");
  const form = document.getElementById("envioForm");
  const pesoInput = document.getElementById("envioPeso");
  const descripcionInput = document.getElementById("envioDescripcion");
  const instruccionesInput = document.getElementById("envioInstrucciones");
  const reglasInput = document.getElementById("envioReglas");
  const msg = document.getElementById("envioMsg");

  const setServicio = (servicio) => {
    const tipo = servicio === "envio" ? "envio" : "viaje";
    viajeState.tipoServicio = tipo;
    panel.querySelectorAll(".envio-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.servicio === tipo);
    });
    form.classList.toggle("hidden", tipo !== "envio");
    actualizarPaquete();
  };

  const limpiarNumero = (value) => {
    const parsed = Number(String(value || "").replace(",", "."));
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(MAX_PESO_KG, Math.max(0.1, parsed));
  };

  function actualizarPaquete() {
    if (viajeState.tipoServicio !== "envio") {
      viajeState.paquete = null;
      msg.textContent = "Maximo 5 kg";
      msg.classList.remove("error");
      return;
    }

    const pesoKg = limpiarNumero(pesoInput.value);
    if (Number(pesoInput.value) !== pesoKg) pesoInput.value = pesoKg.toFixed(1);

    viajeState.paquete = {
      pesoKg,
      descripcion: descripcionInput.value.trim() || "Paquete",
      instrucciones: instruccionesInput.value.trim(),
      reglasAceptadas: Boolean(reglasInput?.checked)
    };

    if (!viajeState.paquete.reglasAceptadas) {
      msg.textContent = "Acceptez les regles des colis pour continuer.";
      msg.classList.add("error");
      return;
    }

    msg.textContent = pesoKg >= MAX_PESO_KG ? "Poids maximum autorise: 5 kg" : "Code de livraison apres confirmation";
    msg.classList.remove("error");
  }

  panel.querySelectorAll(".envio-tab").forEach((btn) => {
    btn.addEventListener("click", () => setServicio(btn.dataset.servicio));
  });

  [pesoInput, descripcionInput, instruccionesInput, reglasInput].filter(Boolean).forEach((input) => {
    input.addEventListener("input", actualizarPaquete);
    input.addEventListener("change", actualizarPaquete);
  });

  const servicioPreferido = localStorage.getItem("bego_servicio_preferido");
  if (servicioPreferido) {
    localStorage.removeItem("bego_servicio_preferido");
  }

  setServicio(servicioPreferido || viajeState.tipoServicio || "viaje");
}
