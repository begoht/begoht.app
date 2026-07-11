export function normalizePosition(posicion) {
  const coords = posicion?.coords || posicion || {};
  const lat = Number(coords.latitude ?? coords.lat);
  const lng = Number(coords.longitude ?? coords.lng);
  const heading = Number.isFinite(Number(coords.heading ?? coords.bearing))
    ? Number(coords.heading ?? coords.bearing)
    : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, heading };
}

export function readFreshPosition() {
  if (!navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(normalizePosition(pos)),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 8000
      }
    );
  });
}
