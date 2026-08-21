import { getMapaInstance } from "../../../map/state/map.motoristas.state.js";
import { mostrarMotoristaEnMapa } from "../../../map/map.motorista.js?v=20260711-car-route-center";
import { MAP_FLYTO_DELAY_MS, MAP_RESIZE_FALLBACK_DELAY_MS } from "./buscandoMotorista.config.js";
import { normalizeMotorista } from "./buscandoMotorista.viewState.js";

export function invalidateSearchMapSize() {
  window.map?.invalidateSize?.();
  getMapaInstance()?.invalidateSize?.();
}

export function ensureSearchMapVisible() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  mapEl.classList.remove("hidden");
  mapEl.style.display = "block";

  if (typeof ResizeObserver === "function") {
    const resizeObserver = new ResizeObserver(() => {
      invalidateSearchMapSize();
      resizeObserver.disconnect();
    });
    resizeObserver.observe(mapEl);
  }

  window.setTimeout(() => {
    invalidateSearchMapSize();
  }, MAP_RESIZE_FALLBACK_DELAY_MS);
}

export function focusMotoristaOnMap(motorista = {}) {
  const normalized = normalizeMotorista(motorista);
  if (!normalized) return;

  ensureSearchMapVisible();
  mostrarMotoristaEnMapa(normalized);

  window.setTimeout(() => {
    const map = getMapaInstance() || window.map;
    if (!map?.flyTo) return;

    const currentZoom = Number(map.getZoom?.() || 14);
    map.flyTo([normalized.lat, normalized.lng], Math.max(currentZoom, 17), {
      animate: true,
      duration: 0.85
    });
  }, MAP_FLYTO_DELAY_MS);
}
