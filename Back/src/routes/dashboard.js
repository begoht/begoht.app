const express = require("express");
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const Viaje = require("../models/Viaje");
const authAdmin = require("../middleware/authAdmin");
const { PLATFORM_WALLET_ID } = require("../config/constants");
const { ensurePlatformAccount } = require("../services/platformAccount.service");
const { ensureCommissionConfig } = require("../services/commission.service");
const { ensureWalletDiscountConfig } = require("../services/walletDiscount.service");

const router = express.Router();
const PLATAFORMA_ID = new mongoose.Types.ObjectId(PLATFORM_WALLET_ID);

router.get("/comisiones", authAdmin, async (req, res) => {
  try {
    await ensurePlatformAccount();
    const wallet = await Wallet.findOne({ userId: PLATAFORMA_ID });

    if (!wallet) {
      return res.json({
        total: 0,
        hoy: 0,
        porMes: [],
        porDia: [],
        ultimos: [],
      });
    }

    const movimientos = wallet.movimientos.filter((m) =>
      ["comision", "comision_viaje", "comision_transferida"].includes(m.tipo)
    );
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    const total = movimientos.reduce((acc, m) => acc + Number(m.monto || 0), 0);
    const hoy = movimientos
      .filter((m) => new Date(m.fecha) >= hoyInicio)
      .reduce((acc, m) => acc + Number(m.monto || 0), 0);

    const porMesMap = {};
    movimientos.forEach((m) => {
      const fecha = new Date(m.fecha);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      porMesMap[key] = (porMesMap[key] || 0) + Number(m.monto || 0);
    });

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const porDiaMap = {};
    movimientos
      .filter((m) => new Date(m.fecha) >= hace30Dias)
      .forEach((m) => {
        const dia = new Date(m.fecha).toISOString().slice(0, 10);
        porDiaMap[dia] = (porDiaMap[dia] || 0) + Number(m.monto || 0);
      });

    res.json({
      total,
      hoy,
      porMes: Object.entries(porMesMap).map(([mes, total]) => ({ mes, total })),
      porDia: Object.entries(porDiaMap).map(([dia, total]) => ({ dia, total })),
      ultimos: movimientos
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 10),
    });
  } catch (err) {
    console.error("Dashboard comisiones error:", err);
    res.status(500).json({ error: "Error dashboard comisiones" });
  }
});

router.get("/resumen", authAdmin, async (req, res) => {
  try {
    await ensurePlatformAccount();

    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const [
      usuariosPorRol,
      viajesPorEstado,
      viajesHoy,
      viajesActivos,
      wallets,
      ultimosViajes,
      ultimosUsuarios,
      finanzas,
      tendencia,
      walletStats,
      deudaComisionesAgg,
      usuariosOnline,
      motoristasDisponibles,
      paquetesActivos,
      paquetesRecientes,
      reservasActivas,
      creditosMotoristas,
      viajesPorTipo,
      pagosPorMetodo,
      ciudades,
      plataformaWallet,
      commissionConfig,
      walletDiscountConfig,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: "$rol", total: { $sum: 1 } } }]),
      Viaje.aggregate([{ $group: { _id: "$estado", total: { $sum: 1 } } }]),
      Viaje.countDocuments({ createdAt: { $gte: inicioHoy } }),
      Viaje.find({ estado: { $in: ["buscando", "reservado", "asignado", "llego", "en_curso"] } })
        .populate("pasajero", "nombre telefono")
        .populate("motorista", "nombre telefono")
        .sort({ updatedAt: -1 })
        .limit(12)
        .lean(),
      Wallet.find({ userId: { $ne: PLATAFORMA_ID } })
        .populate("userId", "nombre telefono rol")
        .sort({ updatedAt: -1 })
        .limit(40)
        .lean(),
      Viaje.find()
        .populate("pasajero", "nombre telefono")
        .populate("motorista", "nombre telefono")
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
      User.find()
        .select("nombre telefono email rol saldoBloqueado online verificado createdAt")
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
      Viaje.aggregate([
        { $match: { estado: "finalizado" } },
        {
          $group: {
            _id: null,
            totalCobrado: { $sum: "$precio" },
            totalComision: { $sum: "$comision" },
            totalMotoristas: { $sum: "$pagoMotorista" },
            viajesFinalizados: { $sum: 1 },
          },
        },
      ]),
      Viaje.aggregate([
        { $match: { createdAt: { $gte: hace30Dias } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            viajes: { $sum: 1 },
            ingresos: { $sum: "$precio" },
            comision: { $sum: "$comision" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Wallet.aggregate([
        {
          $group: {
            _id: null,
            saldoWallets: { $sum: "$saldo" },
            saldoRetenido: { $sum: "$saldoBloqueado" },
          },
        },
      ]),
      Wallet.aggregate([
        { $match: { saldo: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: "$saldo" } } } },
      ]),
      User.countDocuments({ online: true }),
      User.countDocuments({ rol: "motorista", disponible: true }),
      Viaje.countDocuments({ tipo: "envio", estado: { $in: ["buscando", "reservado", "asignado", "llego", "en_curso"] } }),
      Viaje.find({ tipo: "envio" })
        .populate("pasajero", "nombre telefono")
        .populate("motorista", "nombre telefono")
        .sort({ createdAt: -1 })
        .limit(16)
        .lean(),
      Viaje.find({ estado: "reservado" })
        .populate("pasajero", "nombre telefono")
        .populate("motorista", "nombre telefono")
        .sort({ reservadoEn: -1, updatedAt: -1 })
        .limit(16)
        .lean(),
      Viaje.aggregate([
        { $match: { estado: "finalizado", motorista: { $ne: null } } },
        {
          $group: {
            _id: "$motorista",
            viajesFinalizados: { $sum: 1 },
            ingresoMotorista: { $sum: { $ifNull: ["$pagoMotorista", "$paBeGOrista"] } },
            ultimoViaje: { $max: "$finViajeAt" },
          },
        },
        { $match: { viajesFinalizados: { $gte: 1000 } } },
        { $sort: { viajesFinalizados: -1 } },
        { $limit: 12 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "motorista",
          },
        },
        { $unwind: "$motorista" },
        {
          $project: {
            viajesFinalizados: 1,
            ingresoMotorista: 1,
            ultimoViaje: 1,
            "motorista._id": 1,
            "motorista.nombre": 1,
            "motorista.telefono": 1,
            "motorista.rating": 1,
            "motorista.online": 1,
            "motorista.disponible": 1,
          },
        },
      ]),
      Viaje.aggregate([{ $group: { _id: "$tipo", total: { $sum: 1 } } }]),
      Viaje.aggregate([{ $group: { _id: "$metodoPago", total: { $sum: 1 } } }]),
      Viaje.aggregate([
        { $group: { _id: "$ciudad", total: { $sum: 1 }, activos: { $sum: { $cond: [{ $in: ["$estado", ["buscando", "reservado", "asignado", "llego", "en_curso"]] }, 1, 0] } } } },
        { $sort: { total: -1 } },
        { $limit: 8 },
      ]),
      Wallet.findOne({ userId: PLATAFORMA_ID })
        .select("saldo saldoBloqueado movimientos updatedAt")
        .slice("movimientos", -20)
        .lean(),
      ensureCommissionConfig(),
      ensureWalletDiscountConfig(),
    ]);

    const movimientosPlataforma = [...(plataformaWallet?.movimientos || [])]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({
      usuarios: Object.fromEntries(usuariosPorRol.map((item) => [item._id || "sin_rol", item.total])),
      viajes: Object.fromEntries(viajesPorEstado.map((item) => [item._id || "sin_estado", item.total])),
      metricas: {
        viajesHoy,
        viajesFinalizados: finanzas[0]?.viajesFinalizados || 0,
        totalCobrado: finanzas[0]?.totalCobrado || 0,
        totalComision: finanzas[0]?.totalComision || 0,
        totalMotoristas: finanzas[0]?.totalMotoristas || 0,
        deudaComisiones: deudaComisionesAgg[0]?.total || 0,
        saldoWallets: walletStats[0]?.saldoWallets || 0,
        saldoRetenido: walletStats[0]?.saldoRetenido || 0,
        walletPlataforma: plataformaWallet?.saldo || 0,
        walletPlataformaRetenido: plataformaWallet?.saldoBloqueado || 0,
        usuariosOnline,
        motoristasDisponibles,
        paquetesActivos,
        reservasActivas: reservasActivas.length,
      },
      plataformaWallet: plataformaWallet ? {
        _id: plataformaWallet._id,
        userId: plataformaWallet.userId,
        saldo: plataformaWallet.saldo || 0,
        saldoBloqueado: plataformaWallet.saldoBloqueado || 0,
        updatedAt: plataformaWallet.updatedAt,
        movimientos: movimientosPlataforma,
      } : {
        userId: PLATAFORMA_ID,
        saldo: 0,
        saldoBloqueado: 0,
        movimientos: [],
      },
      operacion: {
        viajesPorTipo: Object.fromEntries(viajesPorTipo.map((item) => [item._id || "sin_tipo", item.total])),
        pagosPorMetodo: Object.fromEntries(pagosPorMetodo.map((item) => [item._id || "sin_metodo", item.total])),
        ciudades,
      },
      config: {
        commission: commissionConfig,
        walletDiscount: walletDiscountConfig,
      },
      tendencia,
      viajesActivos,
      ultimosViajes,
      ultimosUsuarios,
      wallets,
      paquetesRecientes,
      reservasActivas,
      creditosMotoristas,
    });
  } catch (err) {
    console.error("Dashboard resumen error:", err);
    res.status(500).json({ error: "Error dashboard resumen" });
  }
});

router.get("/viajes", authAdmin, async (req, res) => {
  try {
    const estado = req.query.estado;
    const query = estado && estado !== "todos" ? { estado } : {};
    const viajes = await Viaje.find(query)
      .populate("pasajero", "nombre telefono")
      .populate("motorista", "nombre telefono")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(viajes);
  } catch (err) {
    res.status(500).json({ error: "Error listando viajes" });
  }
});

module.exports = router;
