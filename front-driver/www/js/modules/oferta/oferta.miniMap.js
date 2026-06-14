// oferta.miniMap.js

let miniMapa = null;
let layerGroup = null;

export function initMiniMapa() {
  const container = document.getElementById("miniMapaOferta");
  if (!container) return;
  if (!window.L?.map) return;

  if (miniMapa) return;

  miniMapa = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(miniMapa);

  layerGroup = L.layerGroup().addTo(miniMapa);
}

export function renderMiniRuta(origen, destino) {
  if (!miniMapa || !layerGroup) return;
  if (!window.L?.marker) return;

  layerGroup.clearLayers();

  if (!origen?.lat || !destino?.lat) return;

  const origenLatLng = [origen.lat, origen.lng];
  const destinoLatLng = [destino.lat, destino.lng];

  L.marker(origenLatLng).addTo(layerGroup);
  L.marker(destinoLatLng).addTo(layerGroup);

  const polyline = L.polyline([origenLatLng, destinoLatLng], {
    weight: 4
  }).addTo(layerGroup);

  miniMapa.fitBounds(polyline.getBounds(), { padding: [20, 20] });
}

export function destroyMiniMapa() {
  if (miniMapa) {
    miniMapa.remove();
    miniMapa = null;
    layerGroup = null;
  }
}
