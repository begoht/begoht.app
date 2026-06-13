export const ARRIVAL_MAX_DISTANCE_METERS = 150;
export const FINISH_MAX_DISTANCE_METERS = 180;

export function normalizarPunto(input) {
  if (!input) return null;

  const candidates = [
    input,
    input.coords,
    input.ubicacion,
    input.location,
    input.position,
    input.geometry?.location
  ].filter(Boolean);

  for (const candidate of candidates) {
    const fromArray = normalizarArray(candidate);
    if (fromArray) return fromArray;

    const lat = Number(candidate.lat ?? candidate.latitude);
    const lng = Number(candidate.lng ?? candidate.lon ?? candidate.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    const fromCoordinates = normalizarCoordinates(candidate.coordinates);
    if (fromCoordinates) return fromCoordinates;
  }

  return null;
}

export function calcularDistanciaMetros(origen, destino) {
  const start = normalizarPunto(origen);
  const end = normalizarPunto(destino);

  if (!start || !end) return Infinity;

  const earth = 6371000;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earth * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatearDistancia(metros) {
  const value = Number(metros);

  if (!Number.isFinite(value)) return "";
  if (value < 1000) return `${Math.max(0, Math.round(value))} m`;

  return `${(value / 1000).toFixed(1)} km`;
}

function normalizarArray(value) {
  if (!Array.isArray(value) || value.length < 2) return null;

  const first = Number(value[0]);
  const second = Number(value[1]);

  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return { lat: first, lng: second };
  }

  if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
    return { lat: second, lng: first };
  }

  return null;
}

function normalizarCoordinates(value) {
  if (!Array.isArray(value) || value.length < 2) return null;

  const lng = Number(value[0]);
  const lat = Number(value[1]);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return null;
}
