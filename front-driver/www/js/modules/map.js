export let map;
export let rutaLayerRef = { current: null };
export let origenMarkerRef = { current: null };
export let destinoMarkerRef = { current: null };

export function initMap() {
  map = L.map("map", { zoomControl: false })
    .setView([18.5405, -72.3348], 14);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 }
  ).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);
}

/*************************************************
 * 🧹 BORRAR RUTA Y MARCADORES
 *************************************************/
export function borrarRuta() {
  if (!map) return;

  console.log("🗺️ Limpiando elementos del mapa...");

  if (rutaLayerRef.current) {
    map.removeLayer(rutaLayerRef.current);
    rutaLayerRef.current = null;
  }
  if (origenMarkerRef.current) {
    map.removeLayer(origenMarkerRef.current);
    origenMarkerRef.current = null;
  }
  if (destinoMarkerRef.current) {
    map.removeLayer(destinoMarkerRef.current);
    destinoMarkerRef.current = null;
  }
}

/*************************************************
 * 🔥 DIBUJAR RUTA PREMIUM
 *************************************************/
export function dibujarRutaPremium(origen, destino) {
  if (!map || !origen || !destino) return;

  // Limpiar antes de dibujar una nueva
  borrarRuta();

  // Crear marcadores
  origenMarkerRef.current = L.marker([origen.lat, origen.lng]).addTo(map);
  destinoMarkerRef.current = L.marker([destino.lat, destino.lng]).addTo(map);

  // Crear línea premium
  rutaLayerRef.current = L.polyline(
    [
      [origen.lat, origen.lng],
      [destino.lat, destino.lng]
    ],
    {
      color: "#00F5FF",
      weight: 5,
      opacity: 0.8,
      dashArray: "10, 10", // Mejoramos el estilo de la línea
      lineJoin: 'round'
    }
  ).addTo(map);

  map.fitBounds(rutaLayerRef.current.getBounds(), {
    padding: [50, 50]
  });
}