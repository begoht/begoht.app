/*************************************************
 * 🎛️ MODO SIMPLE / PRO (SPA READY PRO)
 *************************************************/
export function initModo() {
  const switchModo = document.getElementById("modoSwitch");
  const titulo = document.getElementById("modoTitulo");
  const desc = document.getElementById("modoDescripcion");
  const body = document.body;

  if (!switchModo || !titulo || !desc) return;

  const modoGuardado = localStorage.getItem("modo") || "pro";

  function aplicarModo(modo) {
    if (modo === "simple") {
      body.classList.add("modo-simple");
      titulo.textContent = "Modo simple";
      desc.textContent = "Interfaz simplificada";
      switchModo.checked = true;
    } else {
      body.classList.remove("modo-simple");
      titulo.textContent = "Modo pro";
      desc.textContent = "Todas las funciones activas";
      switchModo.checked = false;
    }
  }

  aplicarModo(modoGuardado);

  switchModo.onchange = () => {
    const nuevoModo = switchModo.checked ? "simple" : "pro";
    localStorage.setItem("modo", nuevoModo);
    aplicarModo(nuevoModo);
  };

  // UX: click en toda la tarjeta
  document.getElementById("modoToggleBtn")?.addEventListener("click", () => {
    const sw = document.getElementById("modoSwitch");
    if (!sw) return;

    sw.checked = !sw.checked;
    sw.dispatchEvent(new Event("change"));
  });
}