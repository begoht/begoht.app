export let avisoLlegadaEnviado = false;
export let viajeActual = null;

export function actualizarEstadoViaje(estadoBox, estado) {
  if (estadoBox) estadoBox.innerText = estado;
}

export function resetEstadoViaje() {
  avisoLlegadaEnviado = false;
  viajeActual = null;
}
