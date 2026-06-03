// js/geo

import { viajeState } from "../../..js/viaje/viaje.state.js";
import { motoIcon } from "./map.icons.js?v=20260603-transparent-icons";

let mapa; // referencia al mapa Leaflet

/*************************************************
 * 🗺️ SET MAPA (llamar una sola vez)
 *************************************************/
export function setMapa(mapInstance) {
  mapa = mapInstance;
}

/*************************************************
 * 🛵 MOSTRAR MOTORISTA EN EL MAPA
 *************************************************/
export function mostrarMotoristaEnMapa(motorista) {

  // 🔒 BLINDAJE 1 — mapa
  if (!mapa) {
    console.error("❌ Mapa no inicializado");
    return;
  }

  // 🔒 BLINDAJE 2 — objeto null
  if (!motorista || motorista.lat == null || motorista.lng == null) {
    console.log("🧱 Motorista inválido, no se renderiza marcador");
    return;
  }

  const { lat, lng, nombre } = motorista;

  // 🧹 eliminar marker anterior (si existe)
  if (viajeState.motoristaMarker) {
    mapa.removeLayer(viajeState.motoristaMarker);
    viajeState.motoristaMarker = null;
  }

  // 🛵 icono motorista

  // 📍 crear marker
  viajeState.motoristaMarker = L.marker([lat, lng], {
    icon: motoIcon,
  })
    .addTo(mapa)
    .bindPopup(`🛵 ${nombre || "Motorista"}`)
    .openPopup();

  console.log("🗺️ Motorista mostrado en mapa");
}

/*************************************************
 * 🧹 ELIMINAR MOTORISTA DEL MAPA
 *************************************************/
export function eliminarMotoristaDelMapa() {
  if (!mapa) return;

  if (viajeState.motoristaMarker) {
    mapa.removeLayer(viajeState.motoristaMarker);
    viajeState.motoristaMarker = null;
    console.log("🧹 Motorista eliminado del mapa");
  }
}
