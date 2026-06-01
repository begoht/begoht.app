import { cordobaConfig } from "./cordoba/index.js";
import { haitiCityConfigs } from "./haiti/index.js";

const DEFAULT_CITY_ID = "jacmel";

export const CITY_CONFIGS = {
  cordoba: {
    ...cordobaConfig,
    enabled: true,
    launch: false,
    test: true
  },
  ...haitiCityConfigs
};

function getRequestedCity() {
  const params = new URLSearchParams(window.location.search);
  const cityFromUrl = params.get("city");
  const cityFromStorage =
    localStorage.getItem("BEGO_CITY") ||
    localStorage.getItem("CITY");

  return cityFromUrl || cityFromStorage || DEFAULT_CITY_ID;
}

const requestedCity = getRequestedCity();

export const ACTIVE_CITY =
  CITY_CONFIGS[requestedCity]?.enabled !== false
    ? requestedCity
    : DEFAULT_CITY_ID;

export const cityConfig =
  CITY_CONFIGS[ACTIVE_CITY] ||
  CITY_CONFIGS[DEFAULT_CITY_ID];

export function getEnabledCityConfigs() {
  return Object.values(CITY_CONFIGS).filter((city) => city.enabled !== false);
}

export function inferCityConfigFromCoords(coords) {
  return getEnabledCityConfigs().find((city) => coordsInCity(coords, city)) || null;
}

export function persistDetectedCity(cityId) {
  if (!cityId || !CITY_CONFIGS[cityId] || cityId === ACTIVE_CITY) return false;

  localStorage.setItem("BEGO_CITY", cityId);
  return true;
}

export function getBoundsObject(city = cityConfig) {
  const bounds = city?.map?.bounds || [];
  const sw = bounds[0] || [];
  const ne = bounds[1] || [];

  return {
    south: Number(sw[0]),
    west: Number(sw[1]),
    north: Number(ne[0]),
    east: Number(ne[1])
  };
}

export function coordsInCity(coords, city = cityConfig) {
  const lat = Number(coords?.lat);
  const lng = Number(coords?.lng);
  const bounds = getBoundsObject(city);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

export function getSearchViewbox(city = cityConfig) {
  const bounds = getBoundsObject(city);
  return `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`;
}
