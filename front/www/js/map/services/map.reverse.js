import { cityConfig, coordsInCity } from "../config/index.js";

const reverseCache = new Map();

function cacheKey(lat, lng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function buscarPOICercano(lat, lng) {
  const pois = cityConfig?.poi || [];

  return pois.find((poi) => {
    const dLat = Math.abs(poi.lat - lat);
    const dLng = Math.abs(poi.lng - lng);

    return dLat < 0.0015 && dLng < 0.0015;
  });
}

function normalizarDireccion(data) {
  if (!data?.address) {
    return "Direccion desconocida";
  }

  const calle =
    data.address.road ||
    data.address.highway ||
    data.address.residential ||
    data.address.pedestrian ||
    data.address.cycleway ||
    data.address.footway ||
    data.address.path ||
    "";

  const numero = data.address.house_number || "";

  if (calle) {
    return `${calle} ${numero}`.trim();
  }

  return data.display_name?.split(",")[0] || "Punto en el mapa";
}

export async function reverseGeocode(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return "Punto invalido";
  }

  const dentroDeCiudad = coordsInCity({ lat, lng });

  const poi = buscarPOICercano(lat, lng);

  if (poi) {
    return poi.nombre;
  }

  const key = cacheKey(lat, lng);

  if (reverseCache.has(key)) {
    return reverseCache.get(key);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 6000);

    const countryCode = cityConfig?.map?.countryCode || "ht";

    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json` +
      `&addressdetails=1` +
      `&zoom=18` +
      `&lat=${lat}` +
      `&lon=${lng}` +
      `&countrycodes=${countryCode}` +
      `&accept-language=es,fr,en`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "BeGOApp/1.0"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const direccion = normalizarDireccion(data);
    const resolved = direccion === "Direccion desconocida" && !dentroDeCiudad
      ? `Fuera de ${cityConfig?.name || "la ciudad activa"}`
      : direccion;

    reverseCache.set(key, resolved);

    return resolved;
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("reverseGeocode:", error.message);
    }

    return dentroDeCiudad ? "Punto en el mapa" : `Fuera de ${cityConfig?.name || "la ciudad activa"}`;
  }
}
