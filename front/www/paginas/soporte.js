export function renderSoporte() {
  return `
  <div class="css-soporte">

    <main>

      <div class="soporte-busqueda">
        <input type="text" placeholder="Buscá ayuda...">
      </div>

      <section class="soporte-opciones">

        <button class="ripple">
          <i class="fa-solid fa-comments"></i>
          <span>Chat en vivo</span>
        </button>

        <button class="ripple">
          <i class="fa-solid fa-wallet"></i>
          <span>Pagos</span>
        </button>

      </section>

    </main>
  </div>
  `;
}