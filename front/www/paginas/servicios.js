export function renderServicios() {
  return `
  <div class="css-servicios">
    <main class="servicios-page">

      <section class="servicios-hero">
        <span class="servicios-kicker">BeGO Premium</span>
        <h1 class="titulo-servicios">Servicios</h1>
        <p>Todo lo que necesitas para moverte, pagar y seguir tus viajes con una experiencia mas clara.</p>
      </section>

      <section class="servicios-grid">

        <a class="servicio-card servicio-card-featured ripple" href="#/" data-link>
          <i class="fa-solid fa-motorcycle"></i>
          <span>Viajes rapidos</span>
          <p>Movete por la ciudad evitando el trafico</p>
          <small>Ir al mapa</small>
        </a>

        <a class="servicio-card ripple" href="#/seguimiento" data-link>
          <i class="fa-solid fa-location-dot"></i>
          <span>Seguimiento en vivo</span>
          <p>Mira tu recorrido en tiempo real</p>
        </a>

        <a class="servicio-card ripple" href="#/pago" data-link>
          <i class="fa-solid fa-money-bill-wave"></i>
          <span>Tarifas claras</span>
          <p>Precio visible antes de confirmar</p>
        </a>

        <a class="servicio-card ripple" href="#/seguridad" data-link>
          <i class="fa-solid fa-shield-halved"></i>
          <span>Seguridad</span>
          <p>Motoristas verificados y soporte</p>
        </a>

        <a class="servicio-card ripple" href="#/" data-link>
          <i class="fa-solid fa-box"></i>
          <span>Envios</span>
          <p>Entrega rapida de paquetes</p>
        </a>

        <a class="servicio-card ripple" href="#/soporte" data-link>
          <i class="fa-solid fa-clock"></i>
          <span>Disponible 24/7</span>
          <p>Usa BeGO cuando quieras</p>
        </a>

        <a class="servicio-card ripple" href="#/pago" data-link>
          <i class="fa-solid fa-credit-card"></i>
          <span>Pagos</span>
          <p>MonCash, NatCash o tarjeta</p>
        </a>

        <a class="servicio-card ripple" href="#/recarga" data-link>
          <i class="fa-solid fa-mobile-screen-button"></i>
          <span>Recarga Tel</span>
          <p>Recarga tu celular al instante</p>
        </a>

      </section>

    </main>
  </div>
  `;
}
