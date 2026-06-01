export const viajeState = {
  // 🔁 estados del viaje
  activo: false,
  buscando: false,
  asignado: false,
  enCurso: false,
  llego: false,
  cancelado: false,
  precioConfirmado: false,

  // 🆔 datos
  viajeId: null,
  precio: null,
  distanciaKm: null,
  duracionMin: null,
  metodoPago: null,
  estadoPago: null,
  metodoPagosaldoBloqueado: false,
  tipoServicio: "viaje",
  paquete: null,

  // 📍 ubicación
  origen: null,
  destino: null,

  // 🗺️ mapa
  userMarker: null,
  destinoMarker: null,
  motoristaMarker: null,

  // 🛵 motorista
  motorista: null,
  proximoDestino: null,

  // 🧠 control interno
  estado: null
};
