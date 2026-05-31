

let etaInicial = null;
let ultimaETA = null;
let ultimoEstado = null;

/*************************************************
 * 🔥 HELPERS
 *************************************************/
function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/*************************************************
 * 🔥 RESET ETA
 *************************************************/
export function resetETA() {
  etaInicial = null;
  ultimaETA = null;
  ultimoEstado = null;

  const etaText = document.getElementById("driverEtaText");
  const etaBar = document.getElementById("driverEtaBar");

  if (etaText) {
    etaText.textContent = "--";
  }

  if (etaBar) {
    etaBar.style.width = "0%";
  }
}

/*************************************************
 * 🔥 ACTUALIZAR ETA
 *************************************************/
export function actualizarETA({
  minutos,
  estado = null
}) {

  const etaText = document.getElementById("driverEtaText");
  const etaBar = document.getElementById("driverEtaBar");

  if (!etaText || !etaBar) return;

  /*************************************************
   * 🛑 ETA inválida
   *************************************************/
  if (
    minutos == null ||
    isNaN(minutos) ||
    minutos < 0
  ) {
    etaText.textContent = "Calculando...";
    return;
  }

  /*************************************************
   * 🔥 RESET POR CAMBIO DE ESTADO
   *************************************************/
  if (
    estado &&
    ultimoEstado &&
    estado !== ultimoEstado
  ) {
    etaInicial = null;
    ultimaETA = null;
  }

  ultimoEstado = estado;

  /*************************************************
   * 🔥 ANTI-JITTER
   *************************************************/
  if (ultimaETA !== null) {

    // ignorar saltos absurdos
    const diff = Math.abs(minutos - ultimaETA);

    if (diff > 8) {
      minutos = ultimaETA;
    }

    // suavizado
    minutos =
      (ultimaETA * 0.7) +
      (minutos * 0.3);
  }

  minutos = Math.max(0, minutos);

  /*************************************************
   * 🔥 ETA INICIAL
   *************************************************/
  if (
    etaInicial === null ||
    minutos > etaInicial
  ) {
    etaInicial = minutos;
  }

  ultimaETA = minutos;

  /*************************************************
   * 🔥 TEXTO
   *************************************************/
  if (minutos <= 1) {
    etaText.textContent = "Llegando...";
  } else {
    etaText.textContent =
      `${Math.ceil(minutos)} min`;
  }

  /*************************************************
   * 🔥 PROGRESO
   *************************************************/
  let porcentaje = 0;

  if (etaInicial > 0) {
    porcentaje =
      100 -
      ((minutos / etaInicial) * 100);
  }

  porcentaje = clamp(porcentaje, 5, 100);

  etaBar.style.width = `${porcentaje}%`;

  /*************************************************
   * 🎨 COLORES
   *************************************************/
  if (minutos > 5) {

    etaBar.style.background =
      "linear-gradient(90deg,#4caf50,#2e7d32)";

  } else if (minutos > 2) {

    etaBar.style.background =
      "linear-gradient(90deg,#ff9800,#ef6c00)";

  } else {

    etaBar.style.background =
      "linear-gradient(90deg,#f44336,#b71c1c)";
  }
}

/*************************************************
 * 🔥 INICIAR ETA
 *************************************************/
export function iniciarSimulacionETA(min = 6) {

  etaInicial = min;
  ultimaETA = min;

  actualizarETA({
    minutos: min
  });
}

/*************************************************
 * 🔥 DETENER ETA
 *************************************************/
export function detenerSimulacionETA() {
  resetETA();
}