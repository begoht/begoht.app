const { getCommissionRate, calculateCommission } = require("./commission.service");

function toMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

function getTripTotal(viaje = {}) {
  return toMoney(
    viaje.totalPasajero ??
    viaje.totalCobrar ??
    viaje.precio ??
    viaje.escrow ??
    0
  );
}

function buildDriverEarnings(viaje = {}, rate = 0) {
  const totalPasajero = getTripTotal(viaje);
  const comision = toMoney(
    viaje.comision > 0
      ? viaje.comision
      : calculateCommission(totalPasajero, rate)
  );
  const pagoMotorista = toMoney(
    viaje.pagoMotorista > 0
      ? viaje.pagoMotorista
      : viaje.paBeGOrista > 0
        ? viaje.paBeGOrista
        : totalPasajero - comision
  );

  return {
    totalPasajero,
    totalCobrar: totalPasajero,
    comisionEstimada: comision,
    pagoMotorista,
    paBeGOrista: pagoMotorista,
    netoMotorista: pagoMotorista,
    commissionRate: Number(rate || 0),
  };
}

async function getDriverEarningsForViaje(viaje = {}, options = {}) {
  const rate = await getCommissionRate(options);
  return buildDriverEarnings(viaje, rate);
}

module.exports = {
  buildDriverEarnings,
  getDriverEarningsForViaje,
};
