import { CANDIDATE_ANIMATION_MS } from "./buscandoMotorista.config.js";

export function normalizeMotorista(motorista = {}) {
  const lat =
    motorista.lat ??
    motorista.latitude ??
    motorista.ubicacion?.lat ??
    motorista.ubicacionActual?.lat ??
    motorista.location?.lat;

  const lng =
    motorista.lng ??
    motorista.lon ??
    motorista.longitude ??
    motorista.ubicacion?.lng ??
    motorista.ubicacionActual?.lng ??
    motorista.location?.lng;

  const normalized = {
    ...motorista,
    lat: Number(lat),
    lng: Number(lng),
    nombre: motorista.nombre || motorista.fullName || "Motorista BeGO"
  };

  if (!Number.isFinite(normalized.lat) || !Number.isFinite(normalized.lng)) {
    return null;
  }

  return normalized;
}

export function setText(modal, selector, value) {
  const el = modal?.querySelector(selector);
  if (el) el.textContent = value;
}

export function setSearchingState(modal) {
  modal.dataset.state = "searching";
  setText(modal, "#busquedaEyebrow", "RECHERCHE");
  setText(modal, "#busquedaTitle", "Votre chauffeur");
  setText(modal, "#textoBusqueda", "Nous recherchons le chauffeur disponible le plus proche.");
  setText(modal, "#motoristaCandidato", "Recherche en cours");
  setText(modal, "#busquedaHint", "La carte reste active pendant la recherche.");
}

export function setCandidateState(modal, motorista = {}) {
  const nombre = motorista.nombre || "Chauffeur proche";

  modal.dataset.state = "candidate";
  setText(modal, "#busquedaEyebrow", "CHAUFFEUR TROUVÉ");
  setText(modal, "#busquedaTitle", "Confirmation");
  setText(modal, "#textoBusqueda", nombre + " reçoit votre offre. Si la réponse expire, BeGO continue automatiquement.");
  setText(modal, "#motoristaCandidato", nombre);
  setText(modal, "#busquedaHint", "Zoom sur le chauffeur pendant la confirmation.");

  modal.querySelector("#boxBusqueda")?.animate(
    [
      { transform: "translateY(0) scale(1)", boxShadow: "0 24px 70px rgba(0, 0, 0, 0.22)" },
      { transform: "translateY(-2px) scale(1.012)", boxShadow: "0 28px 80px rgba(0, 0, 0, 0.28)" },
      { transform: "translateY(0) scale(1)", boxShadow: "0 24px 70px rgba(0, 0, 0, 0.22)" }
    ],
    { duration: CANDIDATE_ANIMATION_MS, easing: "ease-out" }
  );
}

export function setStillSearchingState(modal) {
  if (!modal || modal.dataset.state !== "candidate") return;

  modal.dataset.state = "searching";
  setText(modal, "#busquedaEyebrow", "RECHERCHE");
  setText(modal, "#busquedaTitle", "Recherche en cours");
  setText(modal, "#textoBusqueda", "Ce chauffeur n'a pas accepté à temps. BeGO cherche une autre option.");
  setText(modal, "#motoristaCandidato", "Nouvelle option");
  setText(modal, "#busquedaHint", "Nous gardons la demande ouverte.");
}

export function resetCancelButton(btn) {
  if (!btn) return;

  btn.dataset.cancelando = "false";
  btn.disabled = false;
  btn.innerHTML = [
    "<span>",
    "Annuler",
    "</span>",
    "<span class='bego-search__button-arrow' aria-hidden='true'>↗</span>"
  ].join("");
}
