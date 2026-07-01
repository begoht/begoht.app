import { bindLandingAnalytics, trackLandingEvent } from "../analytics/analytics.module.js";
import { startHeroRuntime } from "./hero.runtime.js";
import { renderLandingPage } from "./landing.view.js?v=20260701-follow-zoom";
import { bindLandingNavigation } from "./navigation.js";

const root = document.getElementById("landing-root");

if (root) {
  root.innerHTML = renderLandingPage();
  document.body.classList.add("landing-ready");

  bindLandingNavigation();
  bindLandingAnalytics(root);
  startHeroRuntime();

  trackLandingEvent("landing_loaded", {
    moduleVersion: "20260701-follow-zoom"
  });
}
