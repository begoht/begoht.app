import { getServerUrl } from "../conexion.js";
import { cityConfig } from "../map/config/index.js?v=20260624-cordoba-gps";

const FALLBACK_OFFERS = [
  {
    id: "fallback-ride",
    title: "-25% aujourd'hui",
    kicker: "Trajet premium",
    description: "Activez votre course avec Wallet BeGO et profitez d'un tarif preferentiel.",
    badgeLabel: "BeGO+",
    icon: "fa-bolt",
    theme: "primary",
    actionRoute: "#/wallet",
  },
  {
    id: "fallback-package",
    title: "Jusqu'a 5 kg",
    kicker: "Colis rapide",
    description: "Envoyez un paquet avec code de livraison securise en 4 chiffres.",
    badgeLabel: "Colis",
    icon: "fa-box",
    theme: "package",
    actionRoute: "#/",
  },
  {
    id: "fallback-wallet",
    title: "Bonus Wallet",
    kicker: "Paiement malin",
    description: "Rechargez votre solde et gardez vos trajets, recus et promotions au meme endroit.",
    badgeLabel: "Wallet",
    icon: "fa-wallet",
    theme: "wallet",
    actionRoute: "#/wallet",
  },
];

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
  if (!section || !track) return;

  try {
    const offers = await fetchPassengerOffers({ placement: "home", limit: 6 });
    if (!offers.length) {
      section.classList.add("hidden");
      return;
    }

    section.classList.remove("hidden");
    track.innerHTML = offers.map(renderHomeOfferCard).join("");
  } catch (err) {
    console.warn("No se pudieron cargar ofertas publicadas:", err);
    track.innerHTML = FALLBACK_OFFERS.map(renderHomeOfferCard).join("");
    section.classList.remove("hidden");
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
    if (status) status.textContent = "Offres de secours";
    list.innerHTML = FALLBACK_OFFERS.map(renderPromoListCard).join("");
  }
}

export function renderHomeOfferCard(offer) {
  const actionRoute = normalizeRoute(offer.actionRoute);

  return `
    <article class="home-promo-card ${themeClass(offer.theme)}" data-offer-id="${escapeAttr(offer.id)}">
      <a class="home-promo-link" href="${escapeAttr(actionRoute)}" data-link>
        <div class="home-promo-copy">
          <span class="home-promo-kicker">${escapeHtml(offer.kicker || "Offre BeGO")}</span>
          <h2>${escapeHtml(offer.title || "Offre BeGO")}</h2>
          <p>${escapeHtml(offer.description || "")}</p>
        </div>
        <div class="home-promo-badge">
          <i class="fa-solid ${escapeAttr(offer.icon || "fa-gift")}"></i>
          <span>${escapeHtml(offer.badgeLabel || "BeGO")}</span>
        </div>
      </a>
    </article>
  `;
}

function renderPromoListCard(offer) {
  const actionRoute = normalizeRoute(offer.actionRoute);

  return `
    <article class="promo-page-card ${themeClass(offer.theme)}">
      <a href="${escapeAttr(actionRoute)}" data-link>
        <div class="promo-page-icon">
          <i class="fa-solid ${escapeAttr(offer.icon || "fa-gift")}"></i>
        </div>
        <div>
          <span>${escapeHtml(offer.kicker || "Offre BeGO")}</span>
          <h3>${escapeHtml(offer.title || "Offre BeGO")}</h3>
          <p>${escapeHtml(offer.description || "")}</p>
          <small>${escapeHtml(offer.badgeLabel || "BeGO")}</small>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </a>
    </article>
  `;
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

function themeClass(theme = "primary") {
  return `home-promo-card-${String(theme || "primary").replace(/[^a-z0-9-]/gi, "")}`;
}

function normalizeRoute(value = "#/promos") {
  const route = String(value || "#/promos").trim();
  if (route.startsWith("#/")) return route;
  if (route.startsWith("/")) return route;
  return "#/promos";
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
