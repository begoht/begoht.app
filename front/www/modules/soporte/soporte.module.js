export const SUPPORT_LINKS = Object.freeze({
  email: "mailto:support@bego.com.ht",
  legal: "/legal.html",
  instagram: "https://www.instagram.com/bego.haiti",
  tiktok: "https://www.tiktok.com/@bego.ht"
});

export function renderSupportFooter() {
  return `
    <footer class="site-footer" id="soporte">
      <div class="site-shell footer-grid">
        <div class="footer-desc">
          <a href="#home" class="brand" data-analytics="footer_home">
            <span>Be</span>GO<span class="dot">.</span>
          </a>
          <p>Micro-movilidad, logistica y pagos digitales para Haiti, con una arquitectura preparada para crecer por modulos.</p>
        </div>

        <div class="footer-col">
          <h2>Comunidad</h2>
          <a href="${SUPPORT_LINKS.instagram}" target="_blank" rel="noopener" data-analytics="social_instagram">
            <i class="bx bxl-instagram" aria-hidden="true"></i>
            <span>Instagram @bego.haiti</span>
          </a>
          <a href="${SUPPORT_LINKS.tiktok}" target="_blank" rel="noopener" data-analytics="social_tiktok">
            <i class="bx bxl-tiktok" aria-hidden="true"></i>
            <span>TikTok @bego.ht</span>
          </a>
        </div>

        <div class="footer-col">
          <h2>Soporte</h2>
          <a href="${SUPPORT_LINKS.email}" data-analytics="support_email">
            <i class="bx bx-envelope" aria-hidden="true"></i>
            <span>support@bego.com.ht</span>
          </a>
          <a href="${SUPPORT_LINKS.legal}" data-analytics="open_legal">
            <i class="bx bx-file" aria-hidden="true"></i>
            <span>Terminos y condiciones</span>
          </a>
        </div>
      </div>

      <div class="site-shell footer-bottom">
        <span>BeGO Haiti &copy; 2026. Todos los derechos reservados.</span>
        <span>Arquitectura modular para nuevos servicios.</span>
      </div>
    </footer>
  `;
}
