import { viajeState } from "../viaje/viaje.state.js";
import { asignarDestino } from "./map.destino.js";
import { coordsInCity } from "./config/index.js";

const MAX_DESTINOS = 3;
const BASE_KEY = "BeGO_destinos_guardados";

function safeJson(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getUserId() {
  const user =
    safeJson(localStorage.getItem("BeGO_user")) ||
    safeJson(localStorage.getItem("usuario")) ||
    safeJson(localStorage.getItem("user")) ||
    {};

  return user.id || user._id || "local";
}

function storageKey() {
  return `${BASE_KEY}:${getUserId()}`;
}

function getDestinos() {
  const items = safeJson(localStorage.getItem(storageKey()), []);
  return Array.isArray(items)
    ? items
        .filter(item => item && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
        .slice(0, MAX_DESTINOS)
    : [];
}

function setDestinos(items) {
  localStorage.setItem(storageKey(), JSON.stringify(items.slice(0, MAX_DESTINOS)));
}

function shortLabel(text = "Destino guardado") {
  return String(text).split(",")[0].trim() || "Destino guardado";
}

function samePlace(a, b) {
  return (
    Math.abs(Number(a.lat) - Number(b.lat)) < 0.00001 &&
    Math.abs(Number(a.lng) - Number(b.lng)) < 0.00001
  );
}

function createShell() {
  const mapShell = document.querySelector(".home-map-shell");
  const fabHost = mapShell || document.body;

  let fab = document.getElementById("destinosFab");
  if (!fab) {
    fab = document.createElement("button");
    fab.id = "destinosFab";
    fab.className = "destinos-fab ripple";
    fab.type = "button";
    fab.setAttribute("aria-label", "Destinos guardados");
    fab.title = "Destinos guardados";
    fab.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
  }

  if (fab.parentElement !== fabHost) {
    fabHost.appendChild(fab);
  }

  if (document.getElementById("destinosPanel")) return;

  const panel = document.createElement("section");
  panel.id = "destinosPanel";
  panel.className = "destinos-panel hidden";
  panel.setAttribute("aria-label", "Destinos guardados");
  panel.innerHTML = `
    <div class="destinos-card">
      <div class="destinos-head">
        <div>
          <span>Hasta ${MAX_DESTINOS} destinos</span>
          <strong>Guardados</strong>
        </div>
        <button type="button" id="destinosClose" class="destinos-icon-btn" aria-label="Cerrar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div id="destinosList" class="destinos-list"></div>

      <button type="button" id="destinosSave" class="destinos-save ripple">
        <i class="fa-solid fa-plus"></i>
        <span>Guardar destino actual</span>
      </button>
      <p id="destinosMsg" class="destinos-msg"></p>
    </div>
  `;

  document.body.appendChild(panel);
}

function setMessage(text, type = "") {
  const msg = document.getElementById("destinosMsg");
  if (!msg) return;

  msg.textContent = text || "";
  msg.className = `destinos-msg ${type}`.trim();
}

function renderList(map) {
  const list = document.getElementById("destinosList");
  if (!list) return;

  const destinos = getDestinos();

  if (!destinos.length) {
    list.innerHTML = `
      <div class="destinos-empty">
        <i class="fa-solid fa-location-dot"></i>
        <span>Elige un destino en el mapa o en la busqueda y guardalo aqui.</span>
      </div>
    `;
    return;
  }

  list.innerHTML = destinos.map((destino, index) => `
    <article class="destino-item">
      <button type="button" class="destino-select" data-index="${index}">
        <i class="fa-solid fa-route"></i>
        <span>${shortLabel(destino.direccion)}</span>
        <small>${destino.direccion || "Destino guardado"}</small>
      </button>
      <button type="button" class="destino-delete" data-index="${index}" aria-label="Eliminar destino">
        <i class="fa-solid fa-trash"></i>
      </button>
    </article>
  `).join("");

  list.querySelectorAll(".destino-select").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const destino = getDestinos()[Number(btn.dataset.index)];
      if (!destino) return;

      if (!viajeState.origen) {
        setMessage("Espera a que cargue tu ubicacion para trazar la ruta.", "error");
        return;
      }

      closePanel();
      await asignarDestino(
        map,
        { lat: Number(destino.lat), lng: Number(destino.lng) },
        destino.direccion || "Destino guardado"
      );
    });
  });

  list.querySelectorAll(".destino-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = getDestinos().filter((_, index) => index !== Number(btn.dataset.index));
      setDestinos(next);
      renderList(map);
      setMessage("Destino eliminado.", "ok");
    });
  });
}

function openPanel(map) {
  const panel = document.getElementById("destinosPanel");
  panel?.classList.remove("hidden");
  renderList(map);
  setMessage("");
}

function closePanel() {
  document.getElementById("destinosPanel")?.classList.add("hidden");
}

function saveCurrentDestination(map) {
  const destino = viajeState.destino;

  if (!destino || !coordsInCity(destino)) {
    setMessage("Primero elige un destino dentro de la ciudad.", "error");
    return;
  }

  const current = {
    lat: Number(destino.lat),
    lng: Number(destino.lng),
    direccion: destino.direccion || "Destino guardado",
    createdAt: Date.now()
  };

  const destinos = getDestinos();
  const withoutDuplicate = destinos.filter(item => !samePlace(item, current));

  if (withoutDuplicate.length >= MAX_DESTINOS) {
    setMessage(`Solo puedes guardar ${MAX_DESTINOS} destinos. Elimina uno para agregar otro.`, "error");
    return;
  }

  setDestinos([current, ...withoutDuplicate]);
  renderList(map);
  setMessage("Destino guardado.", "ok");
}

export function initSavedDestinations(map) {
  if (!map) return;

  createShell();

  const fab = document.getElementById("destinosFab");
  const close = document.getElementById("destinosClose");
  const save = document.getElementById("destinosSave");
  const panel = document.getElementById("destinosPanel");

  if (fab) fab.onclick = () => openPanel(map);

  if (close?.dataset.bound !== "1") {
    close.dataset.bound = "1";
    close.addEventListener("click", closePanel);
  }

  if (save) save.onclick = () => saveCurrentDestination(map);

  if (panel?.dataset.bound !== "1") {
    panel.dataset.bound = "1";
    panel.addEventListener("click", (event) => {
      if (event.target === panel) closePanel();
    });
  }

  renderList(map);
}
