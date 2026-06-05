export const viajeState = {
  // 🔁 estados del viaje
  activo: false,
  cotizando: false,
  buscando: false,
  asignado: false,
  enCurso: false,
  llego: false,
  cancelado: false,
  precioConfirmado: false,

  // 🆔 datos
  viajeId: null,
  quoteId: null,
  precio: null,
  precioBase: null,
  descuentoWallet: 0,
  descuentoWalletRate: 0,
  walletDiscount: null,
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
