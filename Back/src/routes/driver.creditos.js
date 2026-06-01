const express = require("express");
const router = express.Router();
const auth = require("../middleware/authHttp");
const Viaje = require("../models/Viaje");

const MIN_VIAJES_CREDITO = 1000;
const INTERES_SEMANAL = 0.0248;
const CUOTAS = 16;
const LOOKBACK_WEEKS = 8;

router.get("/resumen", auth, async (req, res) => {
  try {
    if (req.user.rol !== "motorista") {
      return res.status(403).json({ ok: false, msg: "Solo motoristas" });
    }

    const motoristaId = req.user.id;
    const now = new Date();
    const startWeek = new Date(now);
    startWeek.setDate(startWeek.getDate() - 7);
    const startLookback = new Date(now);
    startLookback.setDate(startLookback.getDate() - LOOKBACK_WEEKS * 7);

    const [totalFinalizados, viajesRecientes] = await Promise.all([
      Viaje.countDocuments({
        motorista: motoristaId,
        estado: "finalizado"
      }),
      Viaje.find({
        motorista: motoristaId,
        estado: "finalizado",
        $or: [
          { finViajeAt: { $gte: startLookback } },
          { finViajeAt: null, createdAt: { $gte: startLookback } }
        ]
      })
        .select("precio pagoMotorista paBeGOrista finViajeAt createdAt")
        .lean()
    ]);

    const metricas = calcularMetricasCredito({
      totalFinalizados,
      viajesRecientes,
      now,
      startWeek
    });

    res.json({
      ok: true,
      minimoViajes: MIN_VIAJES_CREDITO,
      cuotas: CUOTAS,
      interesSemanal: INTERES_SEMANAL,
      ...metricas
    });
  } catch (err) {
    console.error("Error resumen creditos motorista:", err);
    res.status(500).json({ ok: false, msg: "Error interno calculando creditos" });
  }
});

function calcularMetricasCredito({ totalFinalizados, viajesRecientes, now, startWeek }) {
  const elegible = totalFinalizados >= MIN_VIAJES_CREDITO;
  const restantes = Math.max(0, MIN_VIAJES_CREDITO - totalFinalizados);
  const recientes = Array.isArray(viajesRecientes) ? viajesRecientes : [];
  const semanaActual = recientes.filter((viaje) => fechaViaje(viaje) >= startWeek);
  const totalLookback = recientes.length;
  const promedioSemanal = totalLookback / LOOKBACK_WEEKS;
  const objetivoSemanal = Math.max(20, Math.round(promedioSemanal || semanaActual.length || 20));
  const rendimientoSemanal = objetivoSemanal > 0
    ? Math.min(160, Math.round((semanaActual.length / objetivoSemanal) * 100))
    : 0;
  const ingresoLookback = recientes.reduce((sum, viaje) => sum + montoMotorista(viaje), 0);
  const ingresoSemanalPromedio = ingresoLookback / LOOKBACK_WEEKS;
  const ingresoSemanaActual = semanaActual.reduce((sum, viaje) => sum + montoMotorista(viaje), 0);
  const factorRendimiento = Math.max(0.35, Math.min(1.25, rendimientoSemanal / 100));
  const montoBase = ingresoSemanalPromedio * 1.6;
  const montoCredito = elegible ? redondearCredito(montoBase * factorRendimiento) : 0;
  const cuotaSemanal = montoCredito > 0 ? calcularCuota(montoCredito, INTERES_SEMANAL, CUOTAS) : 0;
  const porcentajePagado = 0;
  const pagado = 0;
  const aDevolver = Math.round(cuotaSemanal * CUOTAS);

  return {
    elegible,
    estado: elegible ? "preaprobado" : "en_progreso",
    totalViajesFinalizados: totalFinalizados,
    viajesRestantes: restantes,
    viajesSemanaActual: semanaActual.length,
    objetivoSemanal,
    rendimientoSemanal,
    ingresoSemanaActual: Math.round(ingresoSemanaActual),
    ingresoSemanalPromedio: Math.round(ingresoSemanalPromedio),
    montoCredito,
    cuotaSemanal,
    pagado,
    aDevolver,
    porcentajePagado,
    cuotasPagadas: 0,
    proximaCuota: cuotaSemanal,
    proximoCobro: sumarDias(now, 7).toISOString()
  };
}

function fechaViaje(viaje) {
  return new Date(viaje.finViajeAt || viaje.createdAt || Date.now());
}

function montoMotorista(viaje) {
  const value = Number(viaje.pagoMotorista || viaje.paBeGOrista || viaje.precio || 0);
  return Number.isFinite(value) ? value : 0;
}

function redondearCredito(value) {
  const amount = Math.round(Number(value || 0) / 5000) * 5000;
  return Math.max(0, Math.min(750000, amount));
}

function calcularCuota(monto, interes, cuotas) {
  if (!monto || !interes || !cuotas) return 0;
  const factor = Math.pow(1 + interes, cuotas);
  return Math.round(monto * ((interes * factor) / (factor - 1)));
}

function sumarDias(date, dias) {
  const next = new Date(date);
  next.setDate(next.getDate() + dias);
  return next;
}

module.exports = router;
