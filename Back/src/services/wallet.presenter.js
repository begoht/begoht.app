const DEFAULT_MOVEMENT_LIMIT = Number(process.env.WALLET_MOVEMENT_LIMIT || 80);

function toMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function serializeMovement(movement = {}) {
  return {
    id: movement._id?.toString?.() || null,
    tipo: String(movement.tipo || "movimiento"),
    monto: toMoney(movement.monto),
    descripcion: String(movement.descripcion || ""),
    ref: movement.ref || movement.referencia || null,
    fecha: movement.fecha || movement.createdAt || null,
  };
}

function serializeMovements(movements = [], limit = DEFAULT_MOVEMENT_LIMIT) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || DEFAULT_MOVEMENT_LIMIT));

  return [...(Array.isArray(movements) ? movements : [])]
    .sort((a, b) => new Date(b.fecha || b.createdAt || 0) - new Date(a.fecha || a.createdAt || 0))
    .slice(0, safeLimit)
    .map(serializeMovement);
}

function serializeWallet(wallet, options = {}) {
  const source = typeof wallet?.toObject === "function" ? wallet.toObject() : wallet;
  const saldo = toMoney(source?.saldo);
  const saldoBloqueado = toMoney(source?.saldoBloqueado);

  const payload = {
    id: source?._id?.toString?.() || null,
    userId: source?.userId?.toString?.() || null,
    saldo,
    saldoBloqueado,
    saldoDisponible: saldo,
    movimientos: serializeMovements(source?.movimientos || [], options.movementsLimit || 8),
    updatedAt: source?.updatedAt || null,
  };

  if (options.tienePin !== undefined) {
    payload.tienePin = Boolean(options.tienePin);
  }

  return payload;
}

module.exports = {
  toMoney,
  serializeMovement,
  serializeMovements,
  serializeWallet,
};
