const Wallet = require("../models/Wallet");
const { getCommissionDebtLimit } = require("./commission.service");
const {
  ensureDriverVerified,
  filterVerifiedDriverIds,
} = require("./driverVerification.service");

function toMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function legacyDebt(wallet = {}) {
  const saldo = Number(wallet.saldo || 0);
  return saldo < 0 ? Math.abs(saldo) : 0;
}

function currentDebt(wallet = {}) {
  return toMoney(Number(wallet.comisionPendiente || 0) + legacyDebt(wallet));
}

async function normalizeLegacyWalletDebt(wallet, options = {}) {
  if (!wallet || typeof wallet.save !== "function") return wallet;
  if (typeof wallet.normalizarDeudaLegacy !== "function") return wallet;

  if (wallet.normalizarDeudaLegacy()) {
    await wallet.save({ session: options.session });
  }

  return wallet;
}

async function getDriverCommissionStatus(userId, options = {}) {
  const query = Wallet.findOne({ userId });
  if (options.session) query.session(options.session);
  if (options.lean) query.lean();

  const wallet = options.wallet || await query;
  const debtLimit = await getCommissionDebtLimit({ session: options.session });
  const comisionPendiente = currentDebt(wallet);
  const comisionRestante = toMoney(Math.max(0, debtLimit - comisionPendiente));

  return {
    comisionPendiente,
    comisionLimite: debtLimit,
    commissionDebtLimit: debtLimit,
    comisionRestante,
    bloqueadoPorComision: debtLimit > 0 && comisionPendiente >= debtLimit,
  };
}

async function ensureDriverCanReceiveTrips(userId, options = {}) {
  await ensureDriverVerified(userId);

  let wallet = options.wallet || null;

  if (!wallet) {
    const query = Wallet.findOne({ userId });
    if (options.session) query.session(options.session);
    wallet = await query;
  }

  if (wallet) {
    await normalizeLegacyWalletDebt(wallet, options);
  }

  const status = await getDriverCommissionStatus(userId, { ...options, wallet });

  if (status.bloqueadoPorComision) {
    const err = new Error("Commission BeGO pendiente. Paga tu comision para recibir nuevos viajes.");
    err.code = "COMMISSION_LIMIT_REACHED";
    err.status = status;
    throw err;
  }

  return status;
}

async function filterDriversByCommissionLimit(driverIds = []) {
  const ids = [...new Set(driverIds.map((id) => String(id)).filter(Boolean))];
  if (!ids.length) return new Set();

  const verifiedIds = await filterVerifiedDriverIds(ids);
  if (!verifiedIds.size) return verifiedIds;

  const debtLimit = await getCommissionDebtLimit();
  if (debtLimit <= 0) return verifiedIds;

  const wallets = await Wallet.find({ userId: { $in: [...verifiedIds] } })
    .select("userId saldo comisionPendiente")
    .lean();

  const blocked = new Set(
    wallets
      .filter((wallet) => currentDebt(wallet) >= debtLimit)
      .map((wallet) => wallet.userId.toString())
  );

  return new Set([...verifiedIds].filter((id) => !blocked.has(id)));
}

module.exports = {
  currentDebt,
  ensureDriverCanReceiveTrips,
  filterDriversByCommissionLimit,
  getDriverCommissionStatus,
  normalizeLegacyWalletDebt,
  toMoney,
};
