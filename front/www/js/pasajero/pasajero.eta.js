let etaInicial = null;
let ultimaETA = null;
let ultimoEstado = null;
let etaDeadlineMs = 0;
let etaCountdownTimer = null;
let etaCountdownKey = "";
let etaLastIncomingMinutes = null;

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

export function resetETA() {
  etaInicial = null;
  ultimaETA = null;
  ultimoEstado = null;
  etaDeadlineMs = 0;
  etaCountdownKey = "";
  etaLastIncomingMinutes = null;
  if (etaCountdownTimer) window.clearInterval(etaCountdownTimer);
  etaCountdownTimer = null;

  const etaText = document.getElementById("driverEtaText");
  const etaBar = document.getElementById("driverEtaBar");
  if (etaText) etaText.textContent = "--";
  if (etaBar) etaBar.style.width = "0%";
}

export function actualizarETA({ minutos, estado = null, viajeId = null }) {
  const etaText = document.getElementById("driverEtaText");
  const etaBar = document.getElementById("driverEtaBar");
  if (!etaText || !etaBar) return;

  minutos = Number(minutos);
  if (!Number.isFinite(minutos) || minutos < 0) {
    etaText.textContent = "Calculando...";
    return;
  }

  const key = `${viajeId || "viaje"}:${estado || "activo"}`;
  const now = Date.now();
  const remaining = etaDeadlineMs > now ? (etaDeadlineMs - now) / 60000 : 0;

  if (etaCountdownKey !== key || !etaDeadlineMs) {
    etaInicial = Math.max(minutos, 1);
    etaDeadlineMs = now + minutos * 60000;
    etaCountdownKey = key;
  } else if (
    minutos < remaining - 0.2 ||
    (etaLastIncomingMinutes !== null && minutos > etaLastIncomingMinutes + 2)
  ) {
    etaInicial = Math.max(etaInicial || 1, minutos);
    etaDeadlineMs = now + minutos * 60000;
  }

  etaLastIncomingMinutes = minutos;
  ultimaETA = minutos;
  ultimoEstado = estado;

  const render = () => {
    const currentMinutes = Math.max(0, (etaDeadlineMs - Date.now()) / 60000);
    etaText.textContent = currentMinutes <= 1 ? "Llegando..." : `${Math.ceil(currentMinutes)} min`;
    const porcentaje = clamp(100 - ((currentMinutes / Math.max(etaInicial || 1, 1)) * 100), 5, 100);
    etaBar.style.width = `${porcentaje}%`;

    if (currentMinutes > 5) {
      etaBar.style.background = "linear-gradient(90deg,#4caf50,#2e7d32)";
    } else if (currentMinutes > 2) {
      etaBar.style.background = "linear-gradient(90deg,#ff9800,#ef6c00)";
    } else {
      etaBar.style.background = "linear-gradient(90deg,#f44336,#b71c1c)";
    }
  };

  render();
  if (!etaCountdownTimer) etaCountdownTimer = window.setInterval(render, 1000);
}

export function iniciarSimulacionETA(min = 6) {
  actualizarETA({ minutos: min });
}

export function detenerSimulacionETA() {
  resetETA();
}
