const haitiCities = require("./haiti");

const CITY_CONFIGS = {
  ...haitiCities
};

const DEFAULT_CITY_ID = process.env.DEFAULT_CITY || "jacmel";

function getCity(cityId = DEFAULT_CITY_ID) {
  return CITY_CONFIGS[cityId] || CITY_CONFIGS[DEFAULT_CITY_ID] || null;
}

function getEnabledCities() {
  return Object.values(CITY_CONFIGS).filter((city) => city.enabled);
}

function pointInBounds(point, bounds) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

function pointInCity(point, city) {
  return !!city?.bounds && pointInBounds(point, city.bounds);
}

function inferCityFromPoint(point) {
  return getEnabledCities().find((city) => pointInCity(point, city)) || null;
}

function resolveCityForPoints(cityId, points = []) {
  const requestedCity = cityId ? getCity(cityId) : null;

  if (requestedCity) {
    return requestedCity;
  }

  return points.map(inferCityFromPoint).find(Boolean) || getCity();
}

module.exports = {
  CITY_CONFIGS,
  DEFAULT_CITY_ID,
  getCity,
  getEnabledCities,
  inferCityFromPoint,
  pointInCity,
  resolveCityForPoints
};
