export function renderGanancias() {
  return `
    <main class="ganancias">

      <section class="ganancias-hero">
        <h2>💸 Ganá dinero con BeGO</h2>
        <p>Usá tu moto, tu tiempo y empezá a generar ingresos hoy</p>
      </section>

      <section class="ganancias-opciones">

        <!-- MOTORISTA -->
        <div class="ganancia-card">
          <i class="fa-solid fa-motorcycle"></i>
          <h3>Ser motorista</h3>
          <p>Transportá pasajeros y ganá por viaje</p>
          <button class="btn-primary ripple" id="btnMotorista">
            Empezar
          </button>
        </div>

        <!-- REPARTIDOR -->
        <div class="ganancia-card">
          <i class="fa-solid fa-box"></i>
          <h3>Repartidor</h3>
          <p>Entregá pedidos y cobrá por envío</p>
          <button class="btn-primary ripple" disabled>
            Próximamente
          </button>
        </div>

        <!-- REFERIDOS -->
        <div class="ganancia-card">
          <i class="fa-solid fa-user-group"></i>
          <h3>Invitá amigos</h3>
          <p>Ganá comisión por cada referido activo</p>
          <button class="btn-primary ripple" id="btnReferidos">
            Invitar
          </button>
        </div>

      </section>

    </main>
  `;
}