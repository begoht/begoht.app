import { cordobaConfig } from "./cordoba/index.js";
import { haitiCityConfigs } from "./haiti/index.js";

const DEFAULT_CITY_ID = "jacmel";
const TEST_CITY_FLAG = "BEGO_TEST_CITY_ENABLED";

export const CITY_CONFIGS = {
  cordoba: {
    ...cordobaConfig,
    enabled: true,
    launch: false,
    test: true
  },
  ...haitiCityConfigs
};

function persistCityPreference(cityId) {
  const targetCity = CITY_CONFIGS[cityId];
  if (!cityId || !targetCity) return false;

  localStorage.setItem("BEGO_CITY", cityId);

  if (targetCity.test) {
    localStorage.setItem(TEST_CITY_FLAG, "1");
  } else {
    localStorage.removeItem(TEST_CITY_FLAG);
    if (localStorage.getItem("CITY") !== cityId) {
      localStorage.removeItem("CITY");
    }
  }

  return true;
}

function getRequestedCity() {
  const params = new URLSearchParams(window.location.search);
  const cityFromUrl = params.get("city");
  const cityFromStorage =
    localStorage.getItem("BEGO_CITY") ||
    localStorage.getItem("CITY");

  if (cityFromUrl && CITY_CONFIGS[cityFromUrl]) {
    persistCityPreference(cityFromUrl);
    return cityFromUrl;
  }

  const storedCity = CITY_CONFIGS[cityFromStorage];

  if (storedCity?.test && localStorage.getItem(TEST_CITY_FLAG) !== "1") {
    localStorage.removeItem("BEGO_CITY");
    localStorage.removeItem("CITY");
    return DEFAULT_CITY_ID;
  }

  return CITY_CONFIGS[cityFromStorage] ? cityFromStorage : DEFAULT_CITY_ID;
}

const requestedCity = getRequestedCity();

export const ACTIVE_CITY =
  CITY_CONFIGS[requestedCity] && CITY_CONFIGS[requestedCity].enabled !== false
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

  return persistCityPreference(cityId);
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
