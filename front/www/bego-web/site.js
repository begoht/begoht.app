(function () {
  const header = document.getElementById("site-header");
  const menuButton = document.getElementById("bego-menu-button");

  function syncHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 18);
  }

  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();

  if (header && menuButton) {
    menuButton.addEventListener("click", () => {
      const next = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(next));
      header.classList.toggle("menu-open", next);
    });

    header.querySelectorAll(".bego-mobile-nav a").forEach((link) => {
      link.addEventListener("click", () => {
        menuButton.setAttribute("aria-expanded", "false");
        header.classList.remove("menu-open");
      });
    });
  }
})();
