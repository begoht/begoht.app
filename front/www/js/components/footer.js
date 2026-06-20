export function renderFooter(route) {
  return `
    <nav>
      <ul>
        <li>
          <a href="#/" data-link aria-label="Inicio" title="Inicio" class="${route === "/" ? "active" : ""}">
            <i class="fa-solid fa-house-chimney"></i>
          </a>
        </li>

        <li>
          <a href="#/servicios" data-link aria-label="Servicios" title="Servicios" class="${route === "/servicios" ? "active" : ""}">
            <i class="fa-solid fa-layer-group"></i>
          </a>
        </li>

        <li class="center-btn">
          <button id="btnPedirViaje" class="btn-footer-principal" type="button" aria-label="Pedir viaje" title="Pedir viaje" disabled>
            <span class="footer-action-core">
              <i class="fa-solid fa-plus"></i>
            </span>
          </button>
        </li>

        <li>
          <a href="#/actividad" data-link aria-label="Actividad" title="Actividad" class="${route === "/actividad" ? "active" : ""}">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </a>
        </li>

        <li>
          <a href="#/cuenta" data-link aria-label="Cuenta" title="Cuenta" class="${route === "/cuenta" ? "active" : ""}">
            <i class="fa-solid fa-user-shield"></i>
          </a>
        </li>
      </ul>
    </nav>
  `;
}
