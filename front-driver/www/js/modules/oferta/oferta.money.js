function toMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

export function formatGourdes(value) {
  return `${toMoney(value).toLocaleString("fr-HT")} G`;
}

export function getPaymentLabel(metodoPago) {
  const metodo = String(metodoPago || "efectivo").toLowerCase();
  if (metodo === "wallet") return "Wallet BeGO";
  if (metodo === "moncash") return "MonCash";
  if (metodo === "natcash") return "NatCash";
  return "Especes";
}

export function isCashMethod(metodoPago) {
  const metodo = String(metodoPago || "efectivo").toLowerCase();
  return metodo === "efectivo" || metodo === "cash" || metodo === "especes";
}

export function getTripMoney(viaje = {}) {
  const totalPasajero = toMoney(
    viaje.totalPasajero ??
    viaje.totalCobrar ??
    viaje.precio ??
    viaje.escrow ??
    0
  );
  const comision = toMoney(
    viaje.comisionEstimada ??
    viaje.comision ??
    0
  );
  const netoMotorista = toMoney(
    viaje.pagoMotorista ??
    viaje.paBeGOrista ??
    viaje.netoMotorista ??
    (comision > 0 ? totalPasajero - comision : totalPasajero)
  );

  return {
    totalPasajero,
    totalCobrar: totalPasajero,
    netoMotorista,
    comision,
    metodoPago: viaje.metodoPago || "efectivo",
  };
}
