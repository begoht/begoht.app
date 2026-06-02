export function initDriverMinimize() {
  const btnMin = document.getElementById("btnMinimizarDriver");
  const bubble = document.getElementById("driverMiniBubble");
  const driverBody = document.getElementById("driverAsignado");
  const menuDriver = document.getElementById("menuDriver");

  const miniFoto = document.getElementById("miniFoto");
  const miniETA = document.getElementById("miniETA");
  const miniNombre = document.getElementById("miniNombre");

  const STORAGE_KEY = "bego:driver-panel-minimized";
  const TRIP_KEY = "bego:driver-panel-trip";
  const MINI_HIDE_DELAY = 4500;
  let miniHideTimer = null;

  if (!btnMin || !bubble || !driverBody) return;

  const showMini = ({ persist = true, userAction = false } = {}) => {
    if (driverBody.classList.contains("oculto")) return;
    if (!userAction && bubble.dataset.autoHidden === "true") return;

    clearTimeout(miniHideTimer);
    bubble.dataset.autoHidden = "false";
    menuDriver?.classList.remove("oculto");
    driverBody.classList.add("minimizado");
    bubble.classList.remove("oculto");
    bubble.setAttribute("aria-hidden", "false");
    if (persist) localStorage.setItem(STORAGE_KEY, "true");

    miniHideTimer = setTimeout(() => {
      bubble.dataset.autoHidden = "true";
      bubble.classList.add("oculto");
      bubble.setAttribute("aria-hidden", "true");
    }, MINI_HIDE_DELAY);
  };

  const showPanel = ({ persist = true } = {}) => {
    clearTimeout(miniHideTimer);
    bubble.dataset.autoHidden = "false";
    menuDriver?.classList.remove("oculto");
    driverBody.classList.remove("oculto");
    driverBody.classList.remove("minimizado");
    bubble.classList.add("oculto");
    bubble.setAttribute("aria-hidden", "true");
    if (persist) localStorage.setItem(STORAGE_KEY, "false");
  };

  window.updateDriverBubble = ({ foto, nombre, eta } = {}) => {
    if (miniFoto && foto) miniFoto.src = foto;
    if (miniNombre) miniNombre.textContent = nombre || "Motorista";
    if (miniETA) miniETA.textContent = eta || "En camino";
  };

  window.syncDriverPanelVisibility = ({ forceOpen = false, viajeId = "" } = {}) => {
    if (viajeId) {
      const nextTrip = String(viajeId);
      const previousTrip = localStorage.getItem(TRIP_KEY);
      if (previousTrip && previousTrip !== nextTrip) {
        localStorage.setItem(STORAGE_KEY, "false");
        bubble.dataset.autoHidden = "false";
      }
      localStorage.setItem(TRIP_KEY, nextTrip);
    }

    if (forceOpen || localStorage.getItem(STORAGE_KEY) !== "true") {
      showPanel({ persist: forceOpen });
      return;
    }

    showMini({ persist: false });
  };

  window.driverBubbleLlego = () => {
    bubble.classList.add("llego");
    if (miniETA) miniETA.textContent = "Llego";

    setTimeout(() => {
      bubble.classList.remove("llego");
    }, 1200);
  };

  window.resetDriverBubble = () => {
    showPanel({ persist: false });
    bubble.classList.add("oculto");
    bubble.dataset.autoHidden = "false";
    driverBody.classList.remove("minimizado");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TRIP_KEY);

    if (miniETA) miniETA.textContent = "En camino";
    if (miniNombre) miniNombre.textContent = "Motorista";
    if (miniFoto) miniFoto.src = "assets/logo_primcial.png";
  };

  window.autoMinimizeDriver = (delay = 4000) => {
    setTimeout(() => {
      if (!driverBody.classList.contains("minimizado")) {
        showMini({ userAction: true });
      }
    }, delay);
  };

  if (btnMin.dataset.ready) {
    window.syncDriverPanelVisibility?.();
    return;
  }

  btnMin.dataset.ready = "true";
  btnMin.setAttribute("aria-label", "Minimizar asignacion");
  bubble.setAttribute("role", "button");
  bubble.setAttribute("tabindex", "0");
  bubble.setAttribute("aria-label", "Abrir asignacion del motorista");
  bubble.setAttribute("aria-hidden", "true");

  btnMin.addEventListener("click", () => showMini({ userAction: true }));
  bubble.addEventListener("click", () => showPanel());
  bubble.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showPanel();
    }
  });
}
