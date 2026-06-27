import { viajeState } from "../../..js/viaje/viaje.state.js";
import { motoIcon } from "./map.icons.js?v=20260620-driver-navigation";
import { getRutaActualCoords } from "./map.js?v=20260627-map-rotate";
import {
  setMotorcycleMarkerPose
} from "./map.motion.js?v=20260627-map-rotate";

let mapa;

export function setMapa(mapInstance) {
  mapa = mapInstance;
}

export function mostrarMotoristaEnMapa(motorista) {
  if (!mapa) {
    console.error("Mapa no inicializado");
    return;
  }

  if (!motorista || motorista.lat == null || motorista.lng == null) {
    console.log("Motorista invalido, no se renderiza marcador");
    return;
  }

  const { lat, lng, nombre, heading } = motorista;

  if (viajeState.motoristaMarker) {
    mapa.removeLayer(viajeState.motoristaMarker);
    viajeState.motoristaMarker = null;
  }

  viajeState.motoristaMarker = L.marker([lat, lng], {
    icon: motoIcon
  })
    .addTo(mapa)
    .bindPopup(`Motorista: ${nombre || "Motorista"}`)
    .openPopup();

  setMotorcycleMarkerPose(viajeState.motoristaMarker, mapa, { lat, lng }, {
    routeCoords: getRutaActualCoords(),
    heading,
    maxSnapDistanceMeters: 85
  });

  console.log("Motorista mostrado en mapa");
}

export function eliminarMotoristaDelMapa() {
  if (!mapa) return;

  if (viajeState.motoristaMarker) {
    mapa.removeLayer(viajeState.motoristaMarker);
    viajeState.motoristaMarker = null;
    console.log("Motorista eliminado del mapa");
  }
}
