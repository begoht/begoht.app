export function initDriverMinimize() {
  const btnMin = document.getElementById("btnMinimizarDriver");
  const bubble = document.getElementById("driverMiniBubble");
  const driverBody = document.getElementById("driverAsignado");

  const miniFoto = document.getElementById("miniFoto");
  const miniETA = document.getElementById("miniETA");
  const miniNombre = document.getElementById("miniNombre");

  if (!btnMin || !bubble || !driverBody) return;

  // evitar doble init
  if (btnMin.dataset.ready) return;
  btnMin.dataset.ready = "true";

  /* =========================
     🔽 MINIMIZAR
  ========================= */
  function minimizar() {
    driverBody.classList.add("minimizado");
    bubble.classList.remove("oculto");
  }

  /* =========================
     🔼 RESTAURAR
  ========================= */
  function restaurar() {
    driverBody.classList.remove("minimizado");
    bubble.classList.add("oculto");
  }

  btnMin.addEventListener("click", minimizar);
  bubble.addEventListener("click", restaurar);

  /* =========================
     🌐 API GLOBAL BURBUJA
  ========================= */

  window.updateDriverBubble = ({ foto, nombre, eta } = {}) => {
    if (miniFoto && foto) miniFoto.src = foto;
    if (miniNombre) miniNombre.textContent = nombre || "Motorista";
    if (miniETA) miniETA.textContent = eta || "En camino";
  };

  window.driverBubbleLlego = () => {
    bubble.classList.add("llego");

    if (miniETA) miniETA.textContent = "Llegó";

    setTimeout(() => {
      bubble.classList.remove("llego");
    }, 1200);
  };

  /* =========================
     🔄 RESET (CUANDO SE OCULTA)
  ========================= */
  window.resetDriverBubble = () => {
    restaurar();
    bubble.classList.add("oculto");

    if (miniETA) miniETA.textContent = "En camino";
    if (miniNombre) miniNombre.textContent = "Motorista";
    if (miniFoto) miniFoto.src = "assets/logo-BeGO.png";
  };

  /* =========================
     🤖 AUTO-MINIMIZAR (UX PRO)
  ========================= */
  window.autoMinimizeDriver = (delay = 4000) => {
    setTimeout(() => {
      if (!driverBody.classList.contains("minimizado")) {
        minimizar();
      }
    }, delay);
  };
}