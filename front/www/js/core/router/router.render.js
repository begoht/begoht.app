import { renderHeader } from "../../components/header.js?v=20260627-map-fluid-arrival";
import { renderFooter } from "../../components/footer.js";

export function renderLayout(route, mainClass, contentHTML) {
  const header = document.getElementById("appHeader");
  const main = document.getElementById("appMain");
  const footer = document.getElementById("appFooter");

  if (!header || !main || !footer) {
    console.error("❌ Layout base no encontrado");
    return;
  }

  // =========================
  // 🎨 HEADER / FOOTER
  // =========================
  header.innerHTML = renderHeader(route);
  footer.innerHTML = renderFooter(route);

  // =========================
  // 🧱 MAIN
  // =========================
  main.className = `app-main ${mainClass || ""}`;
  main.innerHTML = contentHTML || "";

  // =========================
  // 🎯 BODY CLASS (IMPORTANTE)
  // =========================
  const routeName = route === "/" ? "home" : route.replace("/", "");

  document.body.classList.forEach(c => {
    if (c.startsWith("route-")) {
      document.body.classList.remove(c);
    }
  });

  document.body.classList.add(`route-${routeName}`);
}
