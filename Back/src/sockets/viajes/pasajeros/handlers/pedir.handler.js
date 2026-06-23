const viajeService = require("../services/viaje.service");
const cotizacionCache = require("./cotizacion.cache");

module.exports = async function pedirViaje(socket, io, data) {
  const { origen, metodoPago } = data;
  const quoteId = String(data?.quoteId || "").slice(0, 80);

  if (!origen?.lat || !origen?.lng) {
    return socket.emit("viaje-error", { quoteId, mensaje: "Origen invalido" });
  }

  if (!metodoPago) {
    return socket.emit("viaje-error", { quoteId, mensaje: "Metodo de pago requerido" });
  }

  try {
    const cotizacion = await viajeService.cotizar(socket, data);

    await cotizacionCache.guardar(socket.user.id, cotizacion);

    socket.emit("precio-calculado", {
      quoteId,
      precio: cotizacion.precio,
      precioBase: cotizacion.precioBase,
      descuentoWallet: cotizacion.descuentoWallet,
      descuentoWalletRate: cotizacion.descuentoWalletRate,
      walletDiscount: cotizacion.walletDiscount || null,
      distanciaKm: cotizacion.distanciaKm,
      duracionMin: cotizacion.duracionMin,
      metodoPago: cotizacion.metodoPago,
      wallet: cotizacion.wallet || null,
      tipo: cotizacion.tipo,
      paquete: cotizacion.paquete,
      idaVuelta: cotizacion.idaVuelta || null,
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
        quoteId,
        mensaje: "BeGO no esta disponible en esa zona. Para probar, usa ubicaciones dentro de Jacmel o Cordoba."
      });
    }

    if (err.type === "paquete") {
      return socket.emit("viaje-error", {
        quoteId,
        mensaje: err.message === "PESO_ENVIO_MAXIMO"
          ? "L'envoi de colis permet maximum 5 kg."
          : err.message === "PAQUETE_REGLAS_REQUERIDAS"
            ? "Vous devez accepter les regles des colis pour continuer."
            : "Completez les donnees du colis pour continuer."
      });
    }

    if (err.type === "pago_no_disponible") {
      return socket.emit("viaje-error", {
        quoteId,
        code: "PAGO_NO_DISPONIBLE",
        metodoPago: err.metodoPago,
        mensaje: err.messageForUser || "Ce mode de paiement n'est pas disponible pour le moment."
      });
    }

    if (err.type === "pago_invalido") {
      return socket.emit("viaje-error", {
        quoteId,
        mensaje: "Metodo de pago invalido"
      });
    }

    if (err.type === "wallet" || err.message === "SALDO_INSUFICIENTE") {
      return socket.emit("viaje-error", {
        quoteId,
        code: "SALDO_INSUFICIENTE",
        mensaje: "Saldo insuficiente en tu Wallet BeGO.",
        saldo: err.saldo || 0,
        requerido: err.requerido || 0,
        faltante: err.faltante || 0
      });
    }

    console.error("Error en pedir-viaje:", err);
    socket.emit("viaje-error", { quoteId, mensaje: "Error al calcular precio" });
  }
};
