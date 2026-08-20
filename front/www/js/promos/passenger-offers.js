import { getServerUrl } from "../conexion.js";
import { cityConfig } from "../map/config/index.js?v=20260624-cordoba-gps";

export async function fetchPassengerOffers({ placement = "home", limit = 8 } = {}) {
  const city = cityConfig?.id || "all";
  const url = new URL(`${getServerUrl()}/api/offers/passenger`);
  url.searchParams.set("placement", placement);
  url.searchParams.set("city", city);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data.offers) ? data.offers : [];
}

export async function initHomeOffers() {
  const section = document.getElementById("homePromos");
  const track = document.getElementById("homePromosTrack");
  const dots = document.getElementById("homePromosDots");
  if (!section || !track) return;

  section.classList.add("hidden");
  track.innerHTML = "";
  if (dots) dots.innerHTML = "";

  try {
    const offers = await fetchPassengerOffers({ placement: "home", limit: 8 });
    const visibleOffers = offers.filter((offer) => offer.imageUrl);
    if (!visibleOffers.length) return;

    section.classList.remove("hidden");
    track.innerHTML = visibleOffers.map(renderHomeOfferCard).join("");
    renderDots(dots, visibleOffers.length);
    bindPromoDots(track, dots);
  } catch (err) {
    console.warn("No se pudieron cargar ofertas publicadas:", err);
  }
}

export async function initPromosPage() {
  const list = document.getElementById("passengerPromosList");
  const status = document.getElementById("passengerPromosStatus");
  if (!list) return;

  list.innerHTML = renderLoading();

  try {
    const offers = await fetchPassengerOffers({ placement: "promos", limit: 20 });

    if (!offers.length) {
      list.innerHTML = renderEmpty();
      if (status) status.textContent = "Aucune offre active";
      return;
    }

    if (status) status.textContent = `${offers.length} offres actives`;
    list.innerHTML = offers.map(renderPromoListCard).join("");
  } catch (err) {
    console.warn("No se pudieron cargar promociones:", err);
    if (status) status.textContent = "Erreur de chargement";
    list.innerHTML = renderEmpty();
  }
}

export function renderHomeOfferCard(offer) {
  const actionRoute = normalizeRoute(offer.actionRoute);
  const imageUrl = normalizeImageUrl(offer.imageUrl);

  return `
    <article class="home-promo-card" data-offer-id="${escapeAttr(offer.id)}">
      <a class="home-promo-link" href="${escapeAttr(actionRoute)}" data-link>
        <img class="home-promo-image" src="${escapeAttr(imageUrl)}" alt="" loading="lazy">
        <div class="home-promo-overlay"></div>
        <div class="home-promo-content">
          <div class="home-promo-brand">BeGO</div>
          <div class="home-promo-copy">
            <span class="home-promo-kicker">${escapeHtml(offer.kicker || "Offre BeGO")}</span>
            <h2>${renderTitle(offer.title || "Offre BeGO")}</h2>
            ${renderDiscount(offer)}
            <p>${escapeHtml(offer.description || "")}</p>
            ${renderCta(offer.ctaLabel)}
          </div>
        </div>
      </a>
    </article>
  `;
}

function renderPromoListCard(offer) {
  const actionRoute = normalizeRoute(offer.actionRoute);
  const imageUrl = normalizeImageUrl(offer.imageUrl);

  return `
    <article class="promo-page-card">
      <a href="${escapeAttr(actionRoute)}" data-link>
        ${imageUrl ? `<img class="promo-page-image" src="${escapeAttr(imageUrl)}" alt="" loading="lazy">` : ""}
        <div>
          <span>${escapeHtml(offer.kicker || "Offre BeGO")}</span>
          <h3>${escapeHtml(offer.title || "Offre BeGO")}</h3>
          <p>${escapeHtml(offer.description || "")}</p>
          <small>${escapeHtml(offer.ctaLabel || "Voir")}</small>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </a>
    </article>
  `;
}

function renderTitle(title = "") {
  const [first, ...rest] = String(title).split(/\s*\|\s*/);
  const second = rest.join(" | ").trim();
  if (!second) return escapeHtml(first.trim());
  return `${escapeHtml(first.trim())}<span>${escapeHtml(second)}</span>`;
}

function renderDiscount(offer) {
  if (!offer.discount && !offer.discountLabel && !offer.discountSuffix) return "";

  return `
    <div class="home-promo-discount">
      ${offer.discountLabel ? `<small>${escapeHtml(offer.discountLabel)}</small>` : ""}
      ${offer.discount ? `<strong>${escapeHtml(offer.discount)}</strong>` : ""}
      ${offer.discountSuffix ? `<span>${escapeHtml(offer.discountSuffix)}</span>` : ""}
    </div>
  `;
}

function renderCta(label = "") {
  if (!label) return "";
  return `
    <div class="home-promo-preview-cta">
      <span>${escapeHtml(label)}</span>
      <i class="fa-solid fa-arrow-right"></i>
    </div>
  `;
}

function renderDots(container, count) {
  if (!container || count <= 1) {
    if (container) container.innerHTML = "";
    return;
  }

  container.innerHTML = Array.from({ length: count }, (_, index) => (
    `<button type="button" class="${index === 0 ? "active" : ""}" data-promo-dot="${index}" aria-label="Promotion ${index + 1}"></button>`
  )).join("");
}

function bindPromoDots(track, dots) {
  if (!track || !dots) return;
  const buttons = [...dots.querySelectorAll("[data-promo-dot]")];
  if (!buttons.length) return;

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      const card = track.children[index];
      card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    });
  });

  const updateActiveDot = () => {
    const cards = [...track.children];
    const nearestIndex = cards.reduce((bestIndex, card, index) => {
      const current = Math.abs(card.offsetLeft - track.scrollLeft);
      const best = Math.abs(cards[bestIndex].offsetLeft - track.scrollLeft);
      return current < best ? index : bestIndex;
    }, 0);

    buttons.forEach((button, index) => {
      button.classList.toggle("active", index === nearestIndex);
    });
  };

  track.addEventListener("scroll", () => requestAnimationFrame(updateActiveDot), { passive: true });
  updateActiveDot();
}

function renderLoading() {
  return `
    <div class="promos-empty-state">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>Chargement des offres...</span>
    </div>
  `;
}

function renderEmpty() {
  return `
    <div class="promos-empty-state">
      <i class="fa-solid fa-gift"></i>
      <span>Aucune offre active pour le moment.</span>
    </div>
  `;
}

function normalizeRoute(value = "#/promos") {
  const route = String(value || "#/promos").trim();
  if (route.startsWith("#/")) return route;
  if (route.startsWith("/")) return route;
  return "#/promos";
}

function normalizeImageUrl(value = "") {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/") || url.startsWith("./")) return url;
  return "";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
