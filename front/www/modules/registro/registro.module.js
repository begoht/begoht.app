export const REGISTRATION_LINKS = Object.freeze({
  passenger: "/registro.html?mode=registro",
  driver: "/driver/registro.html"
});

export function renderDriverRegistrationButton() {
  return `
    <a class="cta secondary" href="${REGISTRATION_LINKS.driver}" data-analytics="register_driver">
      <i class="bx bx-navigation" aria-hidden="true"></i>
      <span>Conducir en BeGO</span>
    </a>
  `;
}

export function renderRegistrationQuickLinks() {
  return `
    <div class="micro-links" aria-label="Accesos rapidos">
      <a href="${REGISTRATION_LINKS.passenger}" data-analytics="register_passenger">Crear cuenta pasajero</a>
      <span aria-hidden="true">/</span>
      <a href="${REGISTRATION_LINKS.driver}" data-analytics="open_driver_register">Registro motorista</a>
    </div>
  `;
}
