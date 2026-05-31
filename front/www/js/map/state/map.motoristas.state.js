let mapa = null;

export let motoristasCercanos = {};

/*************************************************
 * 🗺️ SET MAPA
 *************************************************/
export function setMapaInstance(mapInstance) {
  mapa = mapInstance;
}

/*************************************************
 * 🗺️ GET MAPA
 *************************************************/
export function getMapaInstance() {
  return mapa;
}

/*************************************************
 * 🧹 RESET MOTORISTAS
 *************************************************/
export function resetMotoristas() {
  motoristasCercanos = {};
}