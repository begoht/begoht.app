const { TARIFA_BASE, PRECIO_POR_KM } = require("../../../../config/tarifas");
const { calcularDistanciaMetros } = require("../../../../utils/geo");
const { pointInCity, resolveCityForPoints } = require("../../../../config/cities");
const viajeRepo = require("../repositories/viaje.repository");
const Viaje = require("../../../../models/Viaje");

module.exports = {

  async obtenerViajeActivo(pasajeroId) {
    return await viajeRepo.findActivo(pasajeroId);
  },

  /*************************************************
   * 🧠 COTIZAR (Cálculo puro, sin guardar)
   *************************************************/
  async cotizar(socket, { origen, destino, metodoPago, city }) {
    const pasajeroId = socket.user.id || socket.user._id;

    // Validar si ya tiene un viaje antes de dejarlo cotizar
    const viajeBloqueante = await Viaje.findOne({
      pasajero: pasajeroId,
      estado: { $in: ["buscando", "reservado", "asignado", "llego", "en_curso"] }
    }).lean();

    if (viajeBloqueante) throw { type: "activo", viaje: viajeBloqueante };

    const puntos = [origen, destino].filter(Boolean);
    const cityConfig = resolveCityForPoints(city, puntos);

    if (
      !cityConfig?.enabled ||
      !puntos.every((punto) => pointInCity(punto, cityConfig))
    ) {
      const err = new Error("CIUDAD_NO_DISPONIBLE");
      err.type = "city";
      err.city = cityConfig?.id || null;
      throw err;
    }

    let distanciaKm = 0;
    let precio = TARIFA_BASE;
    let duracionMin = 0;

    if (destino?.lat && destino?.lng) {
      const metros = calcularDistanciaMetros(origen.lat, origen.lng, destino.lat, destino.lng);
      distanciaKm = Number((metros / 1000).toFixed(2));
      precio = TARIFA_BASE + Math.round(distanciaKm * PRECIO_POR_KM);
      duracionMin = Math.max(1, Math.round((distanciaKm / 24) * 60));
    }

    return {
      origen: {
        lat: origen.lat,
        lng: origen.lng,
        direccion: origen.direccion || "Ubicación actual"
      },
      destino: destino ? {
        lat: destino.lat,
        lng: destino.lng,
        direccion: destino.direccion || "Destino seleccionado"
      } : null,
      distanciaKm,
      duracionMin,
      precio,
      metodoPago,
      ciudad: cityConfig.id
    };
  },

  /*************************************************
   * 💾 CREAR VIAJE (Persistencia con Session)
   *************************************************/
  async crearDesdeCotizacion(socket, cotizacion, session) {
    const pasajeroId = socket.user.id || socket.user._id;

    // El objeto a guardar en MongoDB
    const datosViaje = {
      origen: cotizacion.origen,
      destino: cotizacion.destino,
      ciudad: cotizacion.ciudad,
      distanciaKm: cotizacion.distanciaKm,
      duracionMin: cotizacion.duracionMin,
      precio: cotizacion.precio,
      pasajero: pasajeroId,
      pasajeroSocket: socket.id,
      metodoPago: cotizacion.metodoPago,
      estadoPago: "pendiente",
      estado: "buscando",
      createdAt: new Date()
    };

    // Usamos el repositorio pasando la sesión
    return await viajeRepo.create(datosViaje, { session });
  }
};
