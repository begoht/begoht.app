import { motoIcon } from "../map.icons.js?v=20260718-bego-moto-clean";
import {
  motoristasCercanos
} from "../state/map.motoristas.state.js";
import {
  setMotorcycleMarkerPose
} from "../utils/map.motorcycle.motion.js?v=20260718-bego-moto-heading";

export function renderMotoristas(map, drivers) {
  if (!map || !Array.isArray(drivers)) return;

  const driversUnicos = normalizarDrivers(drivers);
  const idsVisibles = new Set(driversUnicos.map((driver) => String(driver.id || driver._id)));

  Object.keys(motoristasCercanos).forEach((id) => {
    if (!idsVisibles.has(String(id))) {
      map.removeLayer(motoristasCercanos[id]);
      delete motoristasCercanos[id];
    }
  });

  driversUnicos.forEach((driver) => {
    const id = driver.id || driver._id;
    const { lat, lng, nombre, heading } = driver;

    if (!id || lat == null || lng == null) return;

    if (motoristasCercanos[id]) {
      setMotorcycleMarkerPose(
        motoristasCercanos[id],
        map,
        { lat, lng },
        { heading }
      );
      return;
    }

    const marker = L.marker([lat, lng], {
      icon: motoIcon
    }).addTo(map);

    if (nombre) {
      marker.bindPopup(`Motorista: ${nombre}`);
    }

    motoristasCercanos[id] = marker;
    setMotorcycleMarkerPose(marker, map, { lat, lng }, { heading });
  });
}

function normalizarDrivers(drivers) {
  const porId = new Map();

  drivers.forEach((driver) => {
    const id = driver?.id || driver?._id;
    if (!id) return;

    porId.set(String(id), {
      ...driver,
      id: String(id)
    });
  });

  return [...porId.values()];
}

export function clearMotoristas(map) {
  if (!map) return;

  Object.values(motoristasCercanos).forEach((marker) => {
    map.removeLayer(marker);
  });

  Object.keys(motoristasCercanos).forEach((id) => {
    delete motoristasCercanos[id];
  });
}

