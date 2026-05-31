let etaInterval = null;

export function iniciarSimulacionETA(callback) {
  detenerSimulacionETA();

  let tiempo = 5; // ejemplo minutos

  etaInterval = setInterval(() => {
    tiempo--;
    if (callback) callback(tiempo);

    if (tiempo <= 0) {
      detenerSimulacionETA();
    }
  }, 60000);
}

export function detenerSimulacionETA() {
  if (etaInterval) {
    clearInterval(etaInterval);
    etaInterval = null;
    console.log("🛑 Simulación ETA detenida");
  }
}
