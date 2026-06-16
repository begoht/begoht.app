import { trackLandingEvent } from "../analytics/analytics.module.js";

export function bindLandingNavigation() {
  const menuButton = document.getElementById("menuToggle");
  const publicMenu = document.getElementById("publicMenu");
  const navLinks = Array.from(publicMenu?.querySelectorAll("a[href^='#']") || []);

  menuButton?.addEventListener("click", () => {
    const nextOpen = !publicMenu?.classList.contains("is-open");
    publicMenu?.classList.toggle("is-open", nextOpen);
    menuButton.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    trackLandingEvent(nextOpen ? "menu_open" : "menu_close");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      publicMenu?.classList.remove("is-open");
      menuButton?.setAttribute("aria-expanded", "false");
      setActiveLink(navLinks, link.getAttribute("href"));
    });
  });

  bindSectionSpy(navLinks);
}

function bindSectionSpy(navLinks) {
  if (!("IntersectionObserver" in window)) return;

  const sectionById = new Map(
    navLinks
      .map((link) => [link.getAttribute("href")?.slice(1), link])
      .filter(([id]) => Boolean(id))
  );

  const observer = new IntersectionObserver((entries) => {
    const activeEntry = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!activeEntry) return;
    setActiveLink(navLinks, `#${activeEntry.target.id}`);
  }, {
    rootMargin: "-35% 0px -55% 0px",
    threshold: [0.1, 0.35, 0.6]
  });

  sectionById.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

function setActiveLink(navLinks, href) {
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === href);
  });
}
