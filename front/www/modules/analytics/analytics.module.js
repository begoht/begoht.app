const ANALYTICS_EVENT = "bego:landing-analytics";

export function trackLandingEvent(name, meta = {}) {
  if (!name) return;

  const payload = {
    name,
    meta,
    path: window.location.pathname,
    timestamp: new Date().toISOString()
  };

  window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: payload }));

  const endpoint = window.BEGO_ANALYTICS_ENDPOINT;
  if (!endpoint || !navigator.sendBeacon) return;

  try {
    const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon(endpoint, body);
  } catch {
    // Analytics must never block navigation or downloads.
  }
}

export function bindLandingAnalytics(root = document) {
  root.querySelectorAll("[data-analytics]").forEach((element) => {
    element.addEventListener("click", () => {
      trackLandingEvent(element.dataset.analytics, {
        href: element.getAttribute("href") || "",
        text: element.textContent.trim().replace(/\s+/g, " ")
      });
    });
  });
}
