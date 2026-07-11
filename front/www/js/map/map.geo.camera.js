import { cityConfig } from "./config/index.js?v=20260624-cordoba-gps";

export function getCiudadCentro() {
  const [lat, lng] = cityConfig.map.center;
  return {
    lat,
    lng,
    direccion: cityConfig?.map?.defaultAddress || cityConfig.name
  };
}

export function mostrarCentroServicio(map, mensaje, { origen, setInputInicio, renderPasajeroMarker }) {
  const centro = origen || getCiudadCentro();

  map.setView([centro.lat, centro.lng], cityConfig.map.zoom);

  if (origen) {
    setInputInicio(centro.direccion);
    renderPasajeroMarker(map, centro.lat, centro.lng, centro.direccion);
    return;
  }

  setInputInicio(
    mensaje || `Esperando GPS real en ${cityConfig.name}`,
    { placeholder: true }
  );
}

export function centrarMapaEn(map, punto, zoom = 16) {
  if (!map || !punto) return false;

  const lat = Number(punto.lat);
  const lng = Number(punto.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  if (typeof map.flyTo === "function") {
    map.flyTo([lat, lng], Math.max(map.getZoom?.() || zoom, zoom), {
      duration: 0.65
    });
  } else {
    map.setView([lat, lng], zoom);
  }

  return true;
}
