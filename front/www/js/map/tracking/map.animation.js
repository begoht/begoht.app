/*************************************************
 * ✨ ANIMAR MARKER SUAVE
 *************************************************/
export function animarMarker(marker, lat, lng) {

  if (!marker) return;

  const prev = marker.getLatLng();

  const steps = 5;

  let i = 0;

  const deltaLat = (lat - prev.lat) / steps;

  const deltaLng = (lng - prev.lng) / steps;

  const animar = () => {

    if (i >= steps) return;

    marker.setLatLng([
      prev.lat + deltaLat * i,
      prev.lng + deltaLng * i
    ]);

    i++;

    requestAnimationFrame(animar);
  };

  animar();
}