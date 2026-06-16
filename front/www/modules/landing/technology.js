const TECHNOLOGY_CARDS = Object.freeze([
  {
    icon: "bx bx-bolt-circle",
    title: "Asignacion rapida",
    body: "Emparejamiento por proximidad para conectar pasajeros, envios y motoristas disponibles."
  },
  {
    icon: "bx bx-sync",
    title: "Auto-recuperacion",
    body: "Los estados importantes del viaje vuelven a cargarse si se cierra o reabre la app."
  },
  {
    icon: "bx bx-shield-quarter",
    title: "Flujos seguros",
    body: "Validaciones de llegada, distancia y finalizacion pensadas para proteger el viaje."
  },
  {
    icon: "bx bx-line-chart",
    title: "Crecimiento modular",
    body: "Cada negocio puede tener su propia pantalla, analitica y acciones sin mezclar responsabilidades."
  }
]);

export function renderTechnologySection() {
  return `
    <section id="about" class="content-band site-shell" aria-labelledby="technologyTitle">
      <div class="section-head">
        <p class="kicker">Infraestructura tecnologica</p>
        <h2 id="technologyTitle" class="section-title">Disenada para produccion</h2>
        <p>La landing ahora separa presentacion, descargas, wallet, soporte, registro y analitica en modulos claros.</p>
      </div>

      <div class="about-split">
        <div class="engine-section">
          <div class="engine-status">
            <div class="pulse-dot" aria-hidden="true"></div>
            <div>
              <span>Arquitectura publica</span>
              <strong>Landing modular por negocio</strong>
              <p>El nucleo solo arma la pagina. Los contenidos de negocio viven en sus modulos.</p>
            </div>
          </div>
        </div>

        <div class="tech-badges" aria-label="Capacidades de plataforma">
          ${TECHNOLOGY_CARDS.map((card) => `
            <article class="tech-box">
              <i class="${card.icon}" aria-hidden="true"></i>
              <h3>${card.title}</h3>
              <p>${card.body}</p>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}
