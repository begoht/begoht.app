const viajeService = require("../services/viaje.service");
const cotizacionCache = require("./cotizacion.cache");

module.exports = async function pedirViaje(socket, io, data) {
  const { origen, metodoPago } = data;

  if (!origen?.lat || !origen?.lng) {
    return socket.emit("viaje-error", { mensaje: "Origen invalido" });
  }

  if (!metodoPago) {
    return socket.emit("viaje-error", { mensaje: "Metodo de pago requerido" });
  }

  try {
    const cotizacion = await viajeService.cotizar(socket, data);

    await cotizacionCache.guardar(socket.user.id, cotizacion);

    socket.emit("precio-calculado", {
      precio: cotizacion.precio,
      distanciaKm: cotizacion.distanciaKm,
      duracionMin: cotizacion.duracionMin,
      metodoPago,
      origen: cotizacion.origen.direccion,
      destino: cotizacion.destino?.direccion,
      ciudad: cotizacion.ciudad,
      rutaGeometria: cotizacion.rutaGeometria || cotizacion.geometry || null
    });
  } catch (err) {
    if (err.type === "activo") {
      return socket.emit("error-viaje-activo", {
        viajeId: err.viaje._id,
        estado: err.viaje.estado
      });
    }

    if (err.type === "city") {
      return socket.emit("viaje-error", {
        mensaje: "Estamos preparando BeGO para mas ciudades. Por ahora puedes pedir viajes dentro de Jacmel."
      });
    }

    console.error("Error en pedir-viaje:", err);
    socket.emit("viaje-error", { mensaje: "Error al calcular precio" });
  }
};
