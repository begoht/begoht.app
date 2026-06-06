const ROUTE_META = {
  "/": { title: "BeGO", subtitle: "Listo para viajar", icon: "fa-location-arrow" },
  "/servicios": { title: "Servicios", subtitle: "Elige tu experiencia", icon: "fa-grip" },
  "/actividad": { title: "Actividad", subtitle: "Tus viajes y pagos", icon: "fa-file-lines" },
  "/cuenta": { title: "Cuenta", subtitle: "Perfil y beneficios", icon: "fa-circle-user" },
  "/wallet": { title: "Wallet", subtitle: "Saldo y movimientos", icon: "fa-wallet" },
  "/configuracion": { title: "Configuracion", subtitle: "Preferencias", icon: "fa-gear" },
  "/seguridad": { title: "Seguridad", subtitle: "Viaja protegido", icon: "fa-shield-halved" },
  "/ayuda": { title: "Ayuda", subtitle: "Soporte BeGO", icon: "fa-circle-question" },
  "/soporte": { title: "Soporte", subtitle: "Estamos contigo", icon: "fa-headset" },
  "/ganancias": { title: "Ganancias", subtitle: "Genera con BeGO", icon: "fa-money-bill-trend-up" },
  "/detalle-viaje": { title: "Detalle", subtitle: "Resumen del viaje", icon: "fa-route" },
  "/recarga": { title: "Recarga", subtitle: "Agrega saldo", icon: "fa-plus" },
  "/recibo-recarga": { title: "Recibo", subtitle: "Comprobante", icon: "fa-receipt" },
  "/familia": { title: "Familia PRO", subtitle: "Cuentas familiares", icon: "fa-people-roof" },
  "/pago": { title: "Pagos", subtitle: "Metodos disponibles", icon: "fa-credit-card" },
  "/seguimiento": { title: "Seguimiento", subtitle: "Viaje en vivo", icon: "fa-location-dot" },
  "/promos": { title: "Promos", subtitle: "Beneficios activos", icon: "fa-gift" },
  "/legal-confianza": { title: "Legal", subtitle: "Confiance BeGO", icon: "fa-scale-balanced" }
};

function getRouteMeta(route) {
  return ROUTE_META[route] || {
    title: "BeGO",
    subtitle: "Pasajero",
    icon: "fa-circle-dot"
  };
}

function renderAvatar() {
  return `
    <div class="header-avatar ripple" id="avatarBtn" role="button" tabindex="0" aria-label="Cambiar foto de perfil" title="Cambiar foto">
      <span id="avatarFallback" aria-hidden="true">B</span>
      <img id="fotoPerfil" src="" alt="Foto de perfil">
      <span class="avatar-status" aria-hidden="true"></span>
      <input type="file" id="inputFoto" accept="image/*">
    </div>
  `;
}

function renderNotificationButton() {
  return `
    <button type="button" class="header-icon-btn ripple" id="btnNotificaciones" aria-label="Notificaciones" title="Notificaciones">
      <i class="fa-solid fa-bell"></i>
      <span class="header-dot" aria-hidden="true"></span>
    </button>
  `;
}

export function renderHeader(route) {
  const meta = getRouteMeta(route);
  const statusPill = `
    <div class="header-center-brand" aria-label="${meta.subtitle}">
      <span class="brand-mark"><i class="fa-solid ${meta.icon}"></i></span>
      <span>${meta.subtitle}</span>
    </div>
  `;

  if (route === "/") {
    return `
      <nav class="header-shell header-shell-home" aria-label="Cabecera principal">
        <div class="header-profile">
          ${renderAvatar()}
          <div class="header-copy">
            <span class="header-kicker">Hola</span>
            <strong id="nombreUsuario">Invitado</strong>
          </div>
        </div>

        ${statusPill}

        <div class="header-actions">
          <a href="#/wallet" data-link class="header-icon-btn ripple" aria-label="Wallet" title="Wallet">
            <i class="fa-solid fa-wallet"></i>
          </a>
          ${renderNotificationButton()}
        </div>
      </nav>
    `;
  }

  return `
    <nav class="header-shell header-shell-page" aria-label="Cabecera de seccion">
      <div class="header-page-left">
        <button type="button" class="header-icon-btn ripple" id="headerBackBtn" aria-label="Volver" title="Volver">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="header-page-title">
          <span><i class="fa-solid ${meta.icon}"></i> ${meta.subtitle}</span>
          <strong>${meta.title}</strong>
        </div>
      </div>

      <div class="header-actions">
        ${renderNotificationButton()}
        <a class="header-icon-btn ripple ${route === "/configuracion" ? "active" : ""}" id="btnConfig" data-link href="#/configuracion" aria-label="Configuracion" title="Configuracion">
          <i class="fa-solid fa-gear"></i>
        </a>
      </div>
    </nav>
  `;
}
