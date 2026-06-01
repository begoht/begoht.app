const mongoose = require("mongoose");
const viajeService = require("../services/viaje.service");
const Wallet = require("../../../../models/Wallet");
const { asignarViaje } = require("../../../../services/matching_services/matching.service");
const { matchingQueue } = require("../../../../config/queues");
const { redis } = require("../../../../config/redis");

module.exports = async function confirmarViaje(socket, io, data) {

  const userId = socket.user.id;

  if (!data?.origen?.lat || !data?.origen?.lng) {
    return socket.emit("error", { mensaje: "Origen inválido" });
  }

  if (!["efectivo", "wallet", "moncash", "natcash"].includes(data.metodoPago)) {
    return socket.emit("error", { mensaje: "Método de pago inválido" });
  }

  const idemKey = `confirmar:${userId}`;
  const idem = await redis.set(idemKey, "1", "NX", "PX", 10000);

  if (!idem) {
    return socket.emit("info", { mensaje: "Confirmación en proceso..." });
  }

  let session;
  let transactionCommitted = false;

  try {
    /*************************************************
     * 🧾 TRANSACTION START
     *************************************************/
    session = await mongoose.startSession();
    session.startTransaction();

    const activo = await viajeService.obtenerViajeActivo(userId);

    if (activo) {
      throw { type: "activo", viaje: activo };
    }

    const cotizacion = await viajeService.cotizar(socket, data);

    const viaje = await viajeService.crearDesdeCotizacion(socket, cotizacion, session);

    const { actualizarSnapshotPasajero } = require("../services/snapshotPasajero.service");

    await actualizarSnapshotPasajero(userId, {
      viajeId: viaje._id,
      estado: "buscando",
      origenLat: data.origen.lat,
      origenLng: data.origen.lng,
      destinoLat: data.destino?.lat,
      destinoLng: data.destino?.lng,
    });

    /*************************************************
     * 💰 WALLET
     *************************************************/
    if (viaje.metodoPago === "wallet") {

      const wallet = await Wallet.findOneAndUpdate(
        {
          userId: viaje.pasajero,
          saldo: { $gte: viaje.precio }
        },
        {
          $inc: {
            saldo: -viaje.precio,
            saldoBloqueado: viaje.precio
          },
          $push: {
            movimientos: {
              tipo: "bloqueo",
              monto: -viaje.precio,
              descripcion: "Fondos en garantia",
              ref: "VIAJE-" + viaje._id,
              fecha: new Date()
            }
          }
        },
        { new: true, session }
      );

      if (!wallet) {
        throw new Error("SALDO_INSUFICIENTE");
      }

      viaje.estadoPago = "saldoBloqueado";
      viaje.escrow = viaje.precio;

      await viaje.save({ session });

      io.to(`user:${viaje.pasajero}`).emit("wallet:update", wallet);
    }

    /*************************************************
     * 🧾 COMMIT
     *************************************************/
    await session.commitTransaction();
    transactionCommitted = true;
    session.endSession();

    const viajeId = viaje._id.toString();

    /*************************************************
     * 🧠 REDIS STATE
     *************************************************/
    await redis.multi()
      .set(`viaje:status:${viajeId}`, "buscando", "EX", 300)
      .hset(`viaje:data:${viajeId}`, {
        pasajeroId: viaje.pasajero.toString(),
        precio: viaje.precio,
        metodoPago: viaje.metodoPago,
        tipo: viaje.tipo || "viaje",
        paquete: viaje.paquete ? JSON.stringify({
          pesoKg: viaje.paquete.pesoKg,
          descripcion: viaje.paquete.descripcion || "",
          instrucciones: viaje.paquete.instrucciones || "",
          codigoEntregaRequerido: viaje.tipo === "envio"
        }) : "",
        ciudad: viaje.ciudad || "jacmel",
        origen: JSON.stringify(viaje.origen),
        destino: JSON.stringify(viaje.destino),
        creadoEn: Date.now()
      })
      .publish(`viaje:canal:${viajeId}`, JSON.stringify({
        type: "estado",
        estado: "buscando",
        viajeId
      }))
      .exec();

    console.log("🚀 Encolando matching inicial");

    await matchingQueue.add(
      "buscar-motorista",
      { viajeId, radioKm: 2 },
      {
        jobId: `buscar-${viajeId}`,
        removeOnComplete: true
      }
    );

    /*************************************************
     * ⏳ EXPIRACIÓN
     *************************************************/
    await matchingQueue.add(
      "expirar-viaje",
      { viajeId },
      {
        delay: 3 * 60 * 1000,
        jobId: `expirar-${viajeId}`,
        removeOnComplete: true,
        removeOnFail: true
      }
    );

    socket.join(`viaje:${viajeId}`);
    socket.join(`user:${viaje.pasajero}`);

    socket.emit("viaje-buscando", {
      viajeId,
      tipo: viaje.tipo || "viaje",
      paquete: viaje.paquete ? {
        pesoKg: viaje.paquete.pesoKg,
        descripcion: viaje.paquete.descripcion || "",
        instrucciones: viaje.paquete.instrucciones || "",
        codigoEntrega: viaje.tipo === "envio" ? viaje.paquete.codigoEntrega : null
      } : null,
      mensaje: "Buscando al motorista más cercano..."
    });

    console.log(`✅ Viaje ${viajeId} confirmado`);

  } catch (error) {

    /*************************************************
     * ❗ SOLO ABORTAR SI NO SE HIZO COMMIT
     *************************************************/
    if (session && !transactionCommitted) {
      await session.abortTransaction();
      session.endSession();
    }

    if (error?.type === "activo") {
      return socket.emit("error-viaje-activo", {
        viajeId: error.viaje._id,
        estado: error.viaje.estado
      });
    }

    if (error.message === "SALDO_INSUFICIENTE") {
      return socket.emit("viaje-error", {
        mensaje: "Saldo insuficiente en tu billetera 💳"
      });
    }

    if (error?.type === "paquete") {
      return socket.emit("viaje-error", {
        mensaje: error.message === "PESO_ENVIO_MAXIMO"
          ? "El envio de paquete permite maximo 5 kg."
          : "Completa los datos del paquete para continuar."
      });
    }

    console.error("❌ Error en confirmarViaje:", error);

    socket.emit("viaje-error", {
      mensaje: "Error interno al confirmar el viaje"
    });

  } finally {
    await redis.del(idemKey);
  }
};
