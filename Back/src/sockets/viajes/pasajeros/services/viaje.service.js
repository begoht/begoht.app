const { TARIFA_BASE, PRECIO_POR_KM } = require("../../../../config/tarifas");
const { calcularDistanciaMetros } = require("../../../../utils/geo");
const { pointInCity, resolveCityForPoints } = require("../../../../config/cities");
const viajeRepo = require("../repositories/viaje.repository");
const Viaje = require("../../../../models/Viaje");
const Wallet = require("../../../../models/Wallet");
const {
  applyWalletDiscount,
  getWalletDiscountConfig,
} = require("../../../../services/walletDiscount.service");

const MAX_PESO_ENVIO_KG = 5;
const METODOS_PAGO_ACTIVOS = new Set(["efectivo", "wallet"]);
const METODOS_PAGO_PROXIMOS = new Set(["moncash", "natcash"]);

function generarCodigoEntrega() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function normalizarTipo(tipo) {
  return tipo === "envio" ? "envio" : "viaje";
}

function validarMetodoPagoDisponible(metodoPago) {
  const metodo = String(metodoPago || "").toLowerCase();

  if (METODOS_PAGO_PROXIMOS.has(metodo)) {
    const err = new Error("PAGO_NO_DISPONIBLE");
    err.type = "pago_no_disponible";
    err.metodoPago = metodo;
    throw err;
  }

  if (!METODOS_PAGO_ACTIVOS.has(metodo)) {
    const err = new Error("METODO_PAGO_INVALIDO");
    err.type = "pago_invalido";
    err.metodoPago = metodo;
    throw err;
  }

  return metodo;
}

function validarPaquete(tipo, paquete = {}) {
  if (tipo !== "envio") return null;

  const pesoKg = Number(paquete.pesoKg);

  if (!Number.isFinite(pesoKg) || pesoKg <= 0) {
    const err = new Error("PESO_ENVIO_REQUERIDO");
    err.type = "paquete";
    throw err;
  }

  if (pesoKg > MAX_PESO_ENVIO_KG) {
    const err = new Error("PESO_ENVIO_MAXIMO");
    err.type = "paquete";
    throw err;
  }

  return {
    pesoKg: Number(pesoKg.toFixed(2)),
    descripcion: String(paquete.descripcion || "Paquete").trim().slice(0, 160),
    instrucciones: String(paquete.instrucciones || "").trim().slice(0, 220)
  };
}

async function validarSaldoWallet(pasajeroId, precio) {
  const wallet = await Wallet.findOne({ userId: pasajeroId })
    .select("saldo")
    .lean();
  const saldo = Number(wallet?.saldo || 0);
  const requerido = Number(precio || 0);

  if (saldo >= requerido) {
    return { saldo, requerido, faltante: 0, suficiente: true };
  }

  const err = new Error("SALDO_INSUFICIENTE");
  err.type = "wallet";
  err.saldo = saldo;
  err.requerido = requerido;
  err.faltante = Math.max(0, requerido - saldo);
  throw err;
}

module.exports = {

  async obtenerViajeActivo(pasajeroId) {
    return await viajeRepo.findActivo(pasajeroId);
  },

  /*************************************************
   * 🧠 COTIZAR (Cálculo puro, sin guardar)
   *************************************************/
  async cotizar(socket, { origen, destino, metodoPago, city, tipo, paquete }) {
    const pasajeroId = socket.user.id || socket.user._id;
    const tipoServicio = normalizarTipo(tipo);
    const metodoPagoNormalizado = validarMetodoPagoDisponible(metodoPago);
    const paqueteNormalizado = validarPaquete(tipoServicio, paquete);

    if (tipoServicio === "envio" && (!destino?.lat || !destino?.lng)) {
      const err = new Error("DESTINO_ENVIO_REQUERIDO");
      err.type = "paquete";
      throw err;
    }

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
    let precioBase = TARIFA_BASE;
    let duracionMin = 0;

    if (destino?.lat && destino?.lng) {
      const metros = calcularDistanciaMetros(origen.lat, origen.lng, destino.lat, destino.lng);
      distanciaKm = Number((metros / 1000).toFixed(2));
      precioBase = TARIFA_BASE + Math.round(distanciaKm * PRECIO_POR_KM);
      duracionMin = Math.max(1, Math.round((distanciaKm / 24) * 60));
    }

    const walletDiscountConfig = metodoPagoNormalizado === "wallet"
      ? await getWalletDiscountConfig()
      : null;
    const walletDiscount = metodoPagoNormalizado === "wallet"
      ? applyWalletDiscount(precioBase, walletDiscountConfig)
      : applyWalletDiscount(precioBase, { enabled: false });
    const precio = walletDiscount.finalPrice;

    const walletInfo = metodoPagoNormalizado === "wallet"
      ? await validarSaldoWallet(pasajeroId, precio)
      : null;

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
      precioBase,
      descuentoWallet: walletDiscount.discountAmount,
      descuentoWalletRate: walletDiscount.rate,
      walletDiscount: walletDiscount.enabled ? walletDiscount : null,
      metodoPago: metodoPagoNormalizado,
      wallet: walletInfo,
      ciudad: cityConfig.id,
      tipo: tipoServicio,
      paquete: paqueteNormalizado
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
      precioBase: cotizacion.precioBase || cotizacion.precio,
      descuentoWallet: cotizacion.descuentoWallet || 0,
      descuentoWalletRate: cotizacion.descuentoWalletRate || 0,
      pasajero: pasajeroId,
      pasajeroSocket: socket.id,
      metodoPago: cotizacion.metodoPago,
      tipo: cotizacion.tipo || "viaje",
      paquete: cotizacion.tipo === "envio"
        ? {
            ...(cotizacion.paquete || {}),
            codigoEntrega: generarCodigoEntrega()
          }
        : null,
      estadoPago: "pendiente",
      estado: "buscando",
      createdAt: new Date()
    };

    // Usamos el repositorio pasando la sesión
    return await viajeRepo.create(datosViaje, { session });
  }
};
