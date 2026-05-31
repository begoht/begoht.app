// pasajeros/services/tracking/calcularETA.js
const { calcularDistanciaMetros } = require("../../../../../utils/geo");

module.exports = function calcularETA({
  motoristaLat,
  motoristaLng,
  destinoLat,
  destinoLng,
  velocidadPromedioKmh = 30 // Estandarizado para producción
}) {
  if (
    motoristaLat == null ||
    motoristaLng == null ||
    destinoLat == null ||
    destinoLng == null
  ) {
    return { distancia: null, eta: null };
  }

  const distancia = calcularDistanciaMetros(
    motoristaLat,
    motoristaLng,
    destinoLat,
    destinoLng
  );

  if (distancia === null) return { distancia: null, eta: null };

  const velocidadMps = (velocidadPromedioKmh * 1000) / 3600;
  const segundos = distancia / velocidadMps;
  const eta = Math.max(1, Math.ceil(segundos / 60));

  return {
    distancia: Math.round(distancia), // En metros para precisión
    distanciaKm: Number((distancia / 1000).toFixed(2)),
    eta
  };
};