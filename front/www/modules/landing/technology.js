const TECHNOLOGY_CARDS = Object.freeze([
  {
    icon: "bx bx-bolt-circle",
    title: "Asignación inteligente",
    body: "Tecnología avanzada que conecta pasajeros y motoristas cercanos en cuestión de segundos."
  },
  {
    icon: "bx bx-radar",
    title: "Seguimiento en tiempo real",
    body: "Monitoreo preciso de cada viaje desde la aceptación hasta la llegada al destino."
  },
  {
    icon: "bx bx-shield-quarter",
    title: "Seguridad avanzada",
    body: "Procesos de validación y monitoreo diseñados para brindar confianza en cada trayecto."
  },
  {
    icon: "bx bx-line-chart",
    title: "Escalable y preparada para crecer",
    body: "Una infraestructura moderna capaz de incorporar nuevos servicios y expandirse sin límites."
  }
]);

export function renderTechnologySection() {
  return `
    <section id="about" class="content-band site-shell" aria-labelledby="technologyTitle">
      <div class="section-head">
        <p class="kicker">Tecnología de nueva generación</p>
        <h2 id="technologyTitle" class="section-title">Movilidad impulsada por innovación</h2>
        <p>
          Construimos una plataforma sólida, rápida y confiable para ofrecer una experiencia
          excepcional a pasajeros y motoristas en cada interacción.
        </p>
      </div>

      <div class="about-split">
        <div class="engine-section">
          <div class="engine-status">
            <div class="pulse-dot" aria-hidden="true"></div>
            <div>
              <span>Plataforma inteligente</span>
              <strong>Experiencia optimizada en tiempo real</strong>
              <p>
                Cada componente de BeGO está diseñado para ofrecer velocidad,
                estabilidad y una experiencia premium desde la solicitud hasta el destino.
              </p>
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
