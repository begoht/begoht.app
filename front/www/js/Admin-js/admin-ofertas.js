let token = localStorage.getItem("token");

if (!token) {
  window.location.replace("/login.html");
}

if (token?.startsWith('"') && token.endsWith('"')) {
  token = token.slice(1, -1);
}

const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : window.location.origin;

const state = {
  offers: [],
  selectedId: "",
  localImageUrl: "",
};

const els = {
  list: document.getElementById("offersList"),
  search: document.getElementById("offerSearch"),
  form: document.getElementById("offerForm"),
  mode: document.getElementById("editorMode"),
  editorTitle: document.getElementById("editorTitle"),
  selectedStatus: document.getElementById("selectedStatus"),
  preview: document.getElementById("offerPreview"),
  previewImage: document.getElementById("previewImage"),
  previewKicker: document.getElementById("previewKicker"),
  previewTitle: document.getElementById("previewTitle"),
  previewDescription: document.getElementById("previewDescription"),
  previewDiscountLabel: document.getElementById("previewDiscountLabel"),
  previewDiscount: document.getElementById("previewDiscount"),
  previewDiscountSuffix: document.getElementById("previewDiscountSuffix"),
  previewCtaWrap: document.getElementById("previewCtaWrap"),
  previewCta: document.getElementById("previewCta"),
  previewMeta: document.getElementById("previewMeta"),
  imageUploadPreview: document.getElementById("imageUploadPreview"),
};

const fields = {
  id: document.getElementById("offerId"),
  title: document.getElementById("offerTitle"),
  kicker: document.getElementById("offerKicker"),
  description: document.getElementById("offerDescription"),
  discountLabel: document.getElementById("offerDiscountLabel"),
  discount: document.getElementById("offerDiscount"),
  discountSuffix: document.getElementById("offerDiscountSuffix"),
  imageUrl: document.getElementById("offerImage"),
  imageFile: document.getElementById("offerImageFile"),
  sortOrder: document.getElementById("offerOrder"),
  placement: document.getElementById("offerPlacement"),
  city: document.getElementById("offerCity"),
  ctaLabel: document.getElementById("offerCta"),
  actionRoute: document.getElementById("offerAction"),
  startsAt: document.getElementById("offerStartsAt"),
  endsAt: document.getElementById("offerEndsAt"),
  status: document.getElementById("offerStatus"),
};

document.getElementById("newOfferBtn")?.addEventListener("click", () => resetForm());
document.getElementById("resetFormBtn")?.addEventListener("click", () => resetForm());
document.getElementById("refreshOffersBtn")?.addEventListener("click", loadOffers);
els.search?.addEventListener("input", renderOffersList);

Object.values(fields).forEach((field) => {
  field?.addEventListener("input", renderPreview);
  field?.addEventListener("change", renderPreview);
});

fields.imageFile?.addEventListener("change", handleLocalImagePreview);

els.form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveOffer();
});

document.querySelectorAll("[data-status-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    await changeStatus(button.dataset.statusAction);
  });
});

loadOffers().catch((err) => {
  showListMessage(`Impossible de charger les offres : ${err.message}`);
});

async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

async function loadOffers() {
  showListMessage("Chargement des offres...");
  const data = await api("/api/admin/offers");
  state.offers = Array.isArray(data.offers) ? data.offers : [];
  renderOffersList();

  const selected = state.offers.find((offer) => offer.id === state.selectedId);
  if (selected) {
    selectOffer(selected.id);
  } else if (state.offers.length) {
    selectOffer(state.offers[0].id);
  } else {
    resetForm();
  }
}

function renderOffersList() {
  if (!els.list) return;

  const filter = (els.search?.value || "").trim().toLowerCase();
  const rows = state.offers.filter((offer) => {
    const haystack = `${offer.title} ${offer.kicker} ${offer.status} ${offer.city}`.toLowerCase();
    return !filter || haystack.includes(filter);
  });

  if (!rows.length) {
    showListMessage("Aucune offre a afficher.");
    return;
  }

  els.list.innerHTML = rows.map((offer) => `
    <article class="offer-row ${offer.id === state.selectedId ? "active" : ""}">
      <div>
        <strong>${escapeHtml(offer.title)}</strong>
        <span>${escapeHtml(offer.kicker || "Offre BeGO")}</span>
        <small>${statusLabel(offer.status)} - ${escapeHtml(offer.placement)} - ${escapeHtml(offer.city || "all")}</small>
      </div>
      <button type="button" data-select-offer="${escapeAttr(offer.id)}" aria-label="Modifier l'offre">
        <i class="fa-solid fa-pen"></i>
      </button>
    </article>
  `).join("");

  els.list.querySelectorAll("[data-select-offer]").forEach((button) => {
    button.addEventListener("click", () => selectOffer(button.dataset.selectOffer));
  });
}

function selectOffer(id) {
  const offer = state.offers.find((item) => item.id === id);
  if (!offer) return;

  clearLocalImageUrl();
  state.selectedId = id;
  fields.id.value = offer.id;
  fields.title.value = offer.title || "";
  fields.kicker.value = offer.kicker || "";
  fields.description.value = offer.description || "";
  fields.discountLabel.value = offer.discountLabel || "";
  fields.discount.value = offer.discount || "";
  fields.discountSuffix.value = offer.discountSuffix || "";
  fields.imageUrl.value = offer.imageUrl || "";
  fields.sortOrder.value = offer.sortOrder ?? 100;
  fields.placement.value = offer.placement || "both";
  fields.city.value = offer.city || "all";
  fields.ctaLabel.value = offer.ctaLabel || "Voir";
  fields.actionRoute.value = offer.actionRoute || "#/promos";
  fields.startsAt.value = toDateInput(offer.startsAt);
  fields.endsAt.value = toDateInput(offer.endsAt);
  fields.status.value = offer.status || "draft";
  if (fields.imageFile) fields.imageFile.value = "";

  els.mode.textContent = "Modifier l'offre";
  els.editorTitle.textContent = offer.title || "Controle de publication";
  renderPreview();
  renderOffersList();
}

function resetForm() {
  clearLocalImageUrl();
  state.selectedId = "";
  els.form?.reset();
  fields.id.value = "";
  fields.kicker.value = "Offre BeGO";
  fields.discountLabel.value = "Jusqu'a";
  fields.discount.value = "";
  fields.discountSuffix.value = "OFF";
  fields.imageUrl.value = "";
  fields.sortOrder.value = "100";
  fields.placement.value = "both";
  fields.city.value = "all";
  fields.ctaLabel.value = "Voir";
  fields.actionRoute.value = "#/promos";
  fields.status.value = "draft";

  els.mode.textContent = "Creer une offre";
  els.editorTitle.textContent = "Controle de publication";
  renderPreview();
  renderOffersList();
}

async function saveOffer() {
  const payload = getPayload();
  if (!payload.title) {
    alert("Le titre est obligatoire.");
    return;
  }

  if (fields.imageFile?.files?.[0]) {
    const uploaded = await uploadOfferImage(fields.imageFile.files[0]);
    payload.imageUrl = uploaded.imageUrl;
    fields.imageUrl.value = uploaded.imageUrl;
    if (fields.imageFile) fields.imageFile.value = "";
    clearLocalImageUrl();
  }

  if (!payload.imageUrl) {
    alert("Ajoutez une image de campagne pour que le banner couvre tout le fond.");
    return;
  }

  const id = fields.id.value;
  const saved = id
    ? await api(`/api/admin/offers/${id}`, { method: "PUT", body: JSON.stringify(payload) })
    : await api("/api/admin/offers", { method: "POST", body: JSON.stringify(payload) });

  state.selectedId = saved.id;
  await loadOffers();
}

async function uploadOfferImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  return api("/api/admin/offers/upload-image", {
    method: "POST",
    body: formData,
  });
}

async function changeStatus(status) {
  const id = fields.id.value;
  if (!id) {
    fields.status.value = status;
    renderPreview();
    return;
  }

  if (status === "archived" && !confirm("Archiver cette offre ? Elle ne sera plus affichee dans l'app.")) {
    return;
  }

  const updated = await api(`/api/admin/offers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  state.selectedId = updated.id;
  await loadOffers();
}

function getPayload() {
  return {
    title: fields.title.value.trim(),
    kicker: fields.kicker.value.trim(),
    description: fields.description.value.trim(),
    discountLabel: fields.discountLabel.value.trim(),
    discount: fields.discount.value.trim(),
    discountSuffix: fields.discountSuffix.value.trim(),
    imageUrl: fields.imageUrl.value.trim(),
    sortOrder: Number(fields.sortOrder.value || 100),
    placement: fields.placement.value,
    city: fields.city.value,
    ctaLabel: fields.ctaLabel.value.trim(),
    actionRoute: fields.actionRoute.value,
    startsAt: fields.startsAt.value ? new Date(fields.startsAt.value).toISOString() : null,
    endsAt: fields.endsAt.value ? new Date(fields.endsAt.value).toISOString() : null,
    status: fields.status.value,
  };
}

function handleLocalImagePreview() {
  clearLocalImageUrl();
  const file = fields.imageFile?.files?.[0];
  if (!file) {
    renderPreview();
    return;
  }

  state.localImageUrl = URL.createObjectURL(file);
  renderPreview();
}

function clearLocalImageUrl() {
  if (state.localImageUrl) URL.revokeObjectURL(state.localImageUrl);
  state.localImageUrl = "";
}

function renderPreview() {
  const payload = getPayload();
  const imageUrl = state.localImageUrl || payload.imageUrl || "/front/www/assets/logo-bego.png";

  els.previewImage.src = imageUrl;
  els.previewImage.hidden = !imageUrl;
  els.previewKicker.textContent = payload.kicker || "Offre BeGO";
  els.previewTitle.innerHTML = renderTitle(payload.title || "Titre de l'offre");
  els.previewDescription.textContent = payload.description || "Description de l'offre visible par le passager.";
  els.previewDiscountLabel.textContent = payload.discountLabel || "";
  els.previewDiscount.textContent = payload.discount || "";
  els.previewDiscountSuffix.textContent = payload.discountSuffix || "";
  els.previewCta.textContent = payload.ctaLabel || "Voir";
  els.previewCtaWrap.hidden = !payload.ctaLabel;
  els.previewMeta.textContent = placementLabel(payload.placement);
  els.selectedStatus.textContent = statusLabel(payload.status);
  els.selectedStatus.className = `status-pill ${payload.status || "draft"}`;

  if (els.imageUploadPreview) {
    els.imageUploadPreview.innerHTML = imageUrl
      ? `<img src="${escapeAttr(imageUrl)}" alt="">`
      : `<div class="image-upload-empty"><i class="fa-regular fa-image"></i><span>Aucun fichier sélectionné</span></div>`;
  }
}

function renderTitle(title = "") {
  const [first, ...rest] = String(title).split(/\s*\|\s*/);
  const second = rest.join(" | ").trim();
  if (!second) return escapeHtml(first.trim());
  return `${escapeHtml(first.trim())}<span>${escapeHtml(second)}</span>`;
}

function showListMessage(message) {
  if (!els.list) return;
  els.list.innerHTML = `
    <div class="offer-row">
      <div>
        <strong>${escapeHtml(message)}</strong>
        <span>Admin offres passager</span>
      </div>
    </div>
  `;
}

function statusLabel(status) {
  const labels = {
    draft: "Brouillon",
    published: "Publie",
    paused: "En pause",
    archived: "Archive",
  };
  return labels[status] || status || "Brouillon";
}

function placementLabel(placement) {
  const labels = {
    both: "Accueil et Promos",
    home: "Accueil",
    promos: "Promos",
  };
  return labels[placement] || "Accueil";
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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
