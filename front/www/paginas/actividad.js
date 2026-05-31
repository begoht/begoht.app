export function renderActividad() {
  return `
  <div class="css-actividad">
    <main class="actividad-page">
      <section class="actividad-hero">
        <span class="actividad-kicker">Historial BeGO</span>
        <h1 class="titulo-actividad">Actividad</h1>
        <p>Viajes, envios y recargas organizados para revisar rapido cada movimiento.</p>
      </section>

      <section class="actividad-resumen" aria-label="Resumen de actividad">
        <article>
          <i class="fa-solid fa-route"></i>
          <span>Viajes</span>
          <strong id="actividadTotalViajes">--</strong>
        </article>
        <article>
          <i class="fa-solid fa-mobile-screen"></i>
          <span>Recargas</span>
          <strong id="actividadTotalRecargas">--</strong>
        </article>
      </section>

      <section class="actividad-filtros">
        <button class="ripple activo" data-filtro="todos">Todos</button>
        <button class="ripple" data-filtro="viaje">Viajes</button>
        <button class="ripple" data-filtro="envio">Envios</button>
        <button class="ripple" data-filtro="recarga">Recargas</button>
      </section>

      <section id="viajeActivoBox" class="seguridad-card actividad-activa" style="display:none">
        <i class="fa-solid fa-route"></i>
        <div>
          <span>Viaje activo</span>
          <p id="infoViaje">--</p>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </section>

      <section class="actividad-lista">
        <div class="loader-mini"></div>
      </section>

    </main>
  </div>
  `;
}
