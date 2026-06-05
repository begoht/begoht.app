import { flushPendingRatings, queuePendingRating, submitViajeRating } from "./rating/rating.api.js?v=20260605-rating-premium";

const TAG_LABELS = {
  safe: "Securite",
  clean: "Moto propre",
  polite: "Courtoisie",
  fast: "Ponctualite",
  route: "Bon trajet",
  communication: "Communication",
};

export function initRating(data) {
  let ratingSeleccionado = existingScore(data.rating) || 5;
  const selectedTags = new Set(existingTags(data.rating));

  const modal = document.getElementById("modalRating");
  const btnCalificar = document.getElementById("btnCalificarViaje") || document.querySelector(".detalle-acciones .btn-primario");
  const btnEnviar = document.getElementById("btnEnviarRating");
  const btnCerrar = document.getElementById("cerrarRating");
  const btnRepetir = document.getElementById("btnRepetirViaje") || document.querySelector(".btn-secundario");
  const stars = [...document.querySelectorAll(".estrellas [data-value]")];
  const tagButtons = [...document.querySelectorAll("[data-rating-tag]")];
  const comentarioEl = document.getElementById("comentario");
  const statusEl = document.getElementById("ratingStatus");

  if (!modal) return;

  flushPendingRatings().catch(() => {});

  if (data.estado !== "finalizado" || !data._id || !data.motorista) {
    btnCalificar?.remove();
    modal.remove();
    bindRepeat(btnRepetir, data);
    return;
  }

  if (comentarioEl && data.rating?.comentario) {
    comentarioEl.value = data.rating.comentario;
  }

  renderStars(stars, ratingSeleccionado);
  renderTags(tagButtons, selectedTags);
  renderButton(btnCalificar, data.rating);

  btnCalificar?.addEventListener("click", () => {
    setStatus(statusEl, data.rating ? "Vous pouvez ajuster votre note." : "", "neutral");
    modal.classList.remove("hidden");
    modal.querySelector("[data-value]")?.focus?.();
  });

  btnCerrar?.addEventListener("click", () => closeModal(modal));

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) closeModal(modal);
  });

  stars.forEach((star) => {
    star.addEventListener("click", () => {
      ratingSeleccionado = Number(star.dataset.value);
      renderStars(stars, ratingSeleccionado);
      setStatus(statusEl, "", "neutral");
    });
  });

  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tag = button.dataset.ratingTag;
      if (selectedTags.has(tag)) selectedTags.delete(tag);
      else selectedTags.add(tag);
      renderTags(tagButtons, selectedTags);
    });
  });

  btnEnviar?.addEventListener("click", async () => {
    const payload = {
      rating: ratingSeleccionado,
      comentario: comentarioEl?.value || "",
      tags: [...selectedTags],
    };

    setLoading(btnEnviar, true);
    setStatus(statusEl, "Enregistrement...", "neutral");

    try {
      const response = await submitViajeRating(data._id, payload);
      data.rating = toTripRating(response.rating);
      updateStoredDetail(data);
      renderButton(btnCalificar, data.rating);
      setStatus(statusEl, "Note enregistree.", "success");
      window.setTimeout(() => closeModal(modal), 600);
    } catch (err) {
      queuePendingRating(data._id, payload);
      data.rating = {
        score: payload.rating,
        comentario: String(payload.comentario || "").trim(),
        tags: payload.tags,
        pending: true,
      };
      updateStoredDetail(data);
      renderButton(btnCalificar, data.rating);
      setStatus(statusEl, "Connexion instable. La note sera renvoyee automatiquement.", "warning");
    } finally {
      setLoading(btnEnviar, false);
    }
  });

  bindRepeat(btnRepetir, data);
}

function bindRepeat(button, data) {
  button?.addEventListener("click", () => {
    if (data.origen) localStorage.setItem("origen", JSON.stringify(data.origen));
    if (data.destino) localStorage.setItem("destino", JSON.stringify(data.destino));
    location.hash = "#/";
  });
}

function renderStars(stars, rating) {
  stars.forEach((star) => {
    const active = Number(star.dataset.value) <= rating;
    star.classList.toggle("activa", active);
    star.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function renderTags(buttons, selectedTags) {
  buttons.forEach((button) => {
    const selected = selectedTags.has(button.dataset.ratingTag);
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function renderButton(button, rating) {
  if (!button) return;
  const score = existingScore(rating);
  button.classList.toggle("rated", Boolean(score));
  button.innerHTML = score
    ? `<i class="fa-solid fa-star"></i><span>${score.toFixed(0)} / 5</span>`
    : `<i class="fa-solid fa-star"></i><span>Noter</span>`;
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function setLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.classList.toggle("loading", loading);
  button.textContent = loading ? "Enregistrement..." : "Envoyer";
}

function setStatus(element, message, type) {
  if (!element) return;
  element.textContent = message || "";
  element.dataset.type = type || "neutral";
}

function existingScore(value) {
  if (typeof value === "number") return value;
  const score = Number(value?.score ?? value?.rating);
  return Number.isFinite(score) && score > 0 ? Math.max(1, Math.min(5, score)) : 0;
}

function existingTags(value) {
  return Array.isArray(value?.tags) ? value.tags : [];
}

function toTripRating(rating) {
  return {
    score: Number(rating?.rating || 0),
    comentario: rating?.comentario || "",
    tags: rating?.tags || [],
    updatedAt: rating?.updatedAt || new Date().toISOString(),
  };
}

function updateStoredDetail(data) {
  try {
    localStorage.setItem("detalleViaje", JSON.stringify(data));
  } catch {}
}
