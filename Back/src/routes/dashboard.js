const express = require("express");
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const Viaje = require("../models/Viaje");
const authAdmin = require("../middleware/authAdmin");

const router = express.Router();
const PLATAFORMA_ID = new mongoose.Types.ObjectId("000000000000000000000001");

router.get("/comisiones", authAdmin, async (req, res) => {
  try {
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

    const movimientos = wallet.movimientos.filter((m) => m.tipo === "comision");
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
      Wallet.find()
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
    ]);

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
      },
      tendencia,
      viajesActivos,
      ultimosViajes,
      ultimosUsuarios,
      wallets,
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
