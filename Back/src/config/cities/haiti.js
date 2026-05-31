const haitiCities = {
  jacmel: {
    id: "jacmel",
    name: "Jacmel",
    country: "Haiti",
    countryCode: "ht",
    enabled: true,
    launch: true,
    center: { lat: 18.2343, lng: -72.5354 },
    zoom: 14,
    bounds: {
      south: 18.15,
      west: -72.68,
      north: 18.36,
      east: -72.45
    }
  },
  port_au_prince: {
    id: "port_au_prince",
    name: "Port-au-Prince",
    country: "Haiti",
    countryCode: "ht",
    enabled: false,
    launch: false,
    center: { lat: 18.5944, lng: -72.3074 },
    zoom: 13,
    bounds: {
      south: 18.48,
      west: -72.43,
      north: 18.68,
      east: -72.20
    }
  },
  cap_haitien: {
    id: "cap_haitien",
    name: "Cap-Haitien",
    country: "Haiti",
    countryCode: "ht",
    enabled: false,
    launch: false,
    center: { lat: 19.7592, lng: -72.2129 },
    zoom: 13,
    bounds: {
      south: 19.70,
      west: -72.27,
      north: 19.82,
      east: -72.15
    }
  }
};

module.exports = haitiCities;
