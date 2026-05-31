export function renderAyuda() {
  return `
  <div class="css-ayuda">

    <main class="ayuda-container">

  <div class="busqueda-ayuda">
    <input type="text" id="busquedaAyuda" placeholder="¿En qué podemos ayudarte?">
    <i class="fa-solid fa-magnifying-glass"></i>
  </div>

  <section class="ayuda-grid">

    <button href="#/soporte" data-link>
      <i class="fa-solid fa-headset"></i>
      <span>Hablar con soporte</span>
    </button>

    <button href="#/actividad" data-link>
      <i class="fa-solid fa-route"></i>
      <span>Mi viaje</span>
    </button>

    <button href="#/seguridad" data-link>
      <i class="fa-solid fa-shield-halved"></i>
      <span>Seguridad</span>
    </button>

    <button>
      <i class="fa-solid fa-credit-card"></i>
      <span>Pagos y billetera</span>
    </button>

    <button>
      <i class="fa-solid fa-user"></i>
      <span>Cuenta</span>
    </button>

    <button>
      <i class="fa-solid fa-motorcycle"></i>
      <span>Motoristas</span>
    </button>

  </section>

  <section class="faq">
    <h3>Preguntas frecuentes</h3>

    <div class="faq-item">
      <button class="faq-btn">¿Cómo cancelo un viaje?</button>
      <div class="faq-content">Desde la pantalla del viaje podés tocar "Cancelar".</div>
    </div>

    <div class="faq-item">
      <button class="faq-btn">¿Qué hago si el motorista no llega?</button>
      <div class="faq-content">Podés reportarlo o pedir otro motorista.</div>
    </div>

    <div class="faq-item">
      <button class="faq-btn">¿Cómo recargo mi billetera?</button>
      <div class="faq-content">Entrá a Wallet BeGO y elegí un método de pago.</div>
    </div>

  </section>

</main>

  </div>
  `;
}
