export const UI = {
  panel: null, 
  precio: null, 
  metodo: null, 
  contador: null,
  sonido: null, 
  btnAceptar: null, 
  btnRechazar: null,
  origenNombre: null, 
  destinoNombre: null,
  // Agregamos estos para la animación y el mapa
  circulo: null,
  miniMapaContainer: null 
};

export function initUI() {
  UI.panel = document.getElementById("panelOferta");
  UI.precio = document.getElementById("ofertaPrecio");
  UI.metodo = document.getElementById("ofertaMetodo");
  UI.contador = document.getElementById("contadorOferta");
  UI.sonido = document.getElementById("sonidoOferta");
  UI.btnAceptar = document.getElementById("btnAceptar");
  UI.btnRechazar = document.getElementById("btnRechazar");
  UI.origenNombre = document.getElementById("ofertaOrigenNombre");
  UI.destinoNombre = document.getElementById("ofertaDestinoNombre");
  
  // Nuevas referencias según tu HTML
  UI.circulo = document.querySelector(".progress-ring__circle");
  UI.miniMapaContainer = document.getElementById("miniMapaOferta");

  if (UI.panel && UI.panel.parentElement !== document.body) {
    document.body.appendChild(UI.panel);
    UI.panel.style.zIndex = "7000";
  }

  // Configuración inicial del círculo de progreso
  if (UI.circulo) {
    const radius = UI.circulo.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    UI.circulo.style.strokeDasharray = `${circumference} ${circumference}`;
    UI.circulo.style.strokeDashoffset = circumference;
  }
}

export const mostrarPanel = () => {
  if (!UI.panel) return;
  UI.panel.classList.remove("hidden");
  UI.panel.removeAttribute("aria-hidden");
  UI.panel.style.display = "block";
  UI.panel.style.visibility = "visible";
  UI.panel.style.opacity = "1";
  UI.panel.style.pointerEvents = "auto";
  UI.panel.style.position = "fixed";
  UI.panel.style.left = "0";
  UI.panel.style.right = "0";
  UI.panel.style.bottom = "0";
  UI.panel.style.width = "100%";
  UI.panel.style.zIndex = "7000";
  UI.panel.style.transform = "translateY(0)";
  console.log("Oferta visible en pantalla");
};

export const ocultarPanel = () => {
  if (!UI.panel) return;
  UI.panel.classList.add("hidden");
  UI.panel.setAttribute("aria-hidden", "true");
  UI.panel.style.pointerEvents = "none";
  UI.panel.style.transform = "translateY(110%)";
};

export function resetBotonAceptar() {
  if (!UI.btnAceptar) return;
  UI.btnAceptar.disabled = false;
  UI.btnAceptar.style.pointerEvents = "auto";
  UI.btnAceptar.innerHTML = "Accepter";
}

export function notificar(msj, color = "#22c55e") {
  if (typeof Toastify !== "undefined") {
    Toastify({
      text: msj, 
      duration: 3500, 
      gravity: "top", 
      position: "right",
      style: { background: color, borderRadius: "12px", fontWeight: "600" }
    }).showToast();
  } else {
    console.log("Notificación:", msj);
  }
}

export function reproducirSonido() {
  if (!UI.sonido) return;

  UI.sonido.loop = false;
  UI.sonido.pause();
  UI.sonido.currentTime = 0;

  const playPromise = UI.sonido.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        // 🔊 Sonido reproducido correctamente
      })
      .catch((err) => {
        console.warn("🔇 Audio bloqueado por el navegador:", err.message);
      });
  }
}

export function iniciarSonidoOfertaLoop() {
  if (!UI.sonido) return;

  UI.sonido.pause();
  UI.sonido.currentTime = 0;
  UI.sonido.loop = true;

  const playPromise = UI.sonido.play();

  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      console.warn("Audio de oferta bloqueado por el navegador:", err.message);
    });
  }
}

export function detenerSonidoOferta() {
  if (!UI.sonido) return;

  UI.sonido.loop = false;
  UI.sonido.pause();
  UI.sonido.currentTime = 0;
}

/**
 * Actualiza visualmente el progreso del círculo
 * @param {number} restante Segundos que quedan
 * @param {number} total Segundos totales (ej. 15)
 */
export function actualizarCirculoProgreso(restante, total = 15) {
  if (!UI.circulo) return;
  const radius = UI.circulo.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (restante / total) * circumference;
  UI.circulo.style.strokeDashoffset = offset;
}
