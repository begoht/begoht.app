// utils/geo.js
const R = 6371000; // Radio de la Tierra en metros
const PI_180 = Math.PI / 180;

const calcularDistanciaMetros = (lat1, lng1, lat2, lng2) => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return null;
  }

  const dLat = (lat2 - lat1) * PI_180;
  const dLng = (lng2 - lng1) * PI_180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * PI_180) *
    Math.cos(lat2 * PI_180) *
    Math.sin(dLng / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

module.exports = { calcularDistanciaMetros };