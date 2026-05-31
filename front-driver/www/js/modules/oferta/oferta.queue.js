// oferta.queue.js
import { ofertaQueue, CONFIG, getViajeId } from "./oferta.state.js"; // Asegúrate de importar getViajeId

export function agregarACola(viaje) {
  if (ofertaQueue.length >= CONFIG.MAX_QUEUE) {
    ofertaQueue.shift();
  }
  ofertaQueue.push(viaje);
}

// 🔥 NUEVA FUNCIÓN
export function removerDeCola(viajeId) {
  const index = ofertaQueue.findIndex(v => getViajeId(v) === viajeId);
  if (index !== -1) {
    console.log(`🗑️ Viaje ${viajeId} removido de la cola (ya tomado/cancelado)`);
    ofertaQueue.splice(index, 1);
  }
}

export function limpiarColaOfertas() {
  ofertaQueue.length = 0;
}

export function siguienteDeCola() {
  while (ofertaQueue.length > 0) {
    const siguiente = ofertaQueue.shift();
    // Validar expiración antes de retornar
    if (!siguiente.expira || Date.now() < siguiente.expira) {
      return siguiente;
    }
  }
  return null;
}
