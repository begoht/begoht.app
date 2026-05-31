// utils/nuevoViaje.utils.js

function puedeRecibirNuevoViaje(motorista) {
  if (!motorista) return false;

  if (!motorista.viajeActual) return true;

  const estado = motorista.viajeActual.estado;

  return (
    estado === "llego" ||
    estado === "por-finalizar" ||
    estado === "en-destino"
  );
}

module.exports = {
  puedeRecibirNuevoViaje
};
