require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/User");
const Wallet = require("../src/models/Wallet");
const Viaje = require("../src/models/Viaje");
const Recarga = require("../src/models/recarga");

const apply = process.argv.includes("--apply");

async function run() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI no configurado");
  await mongoose.connect(process.env.MONGO_URI);

  const userIds = new Set(
    (await User.find().select("_id").lean()).map((user) => user._id.toString())
  );
  const wallets = await Wallet.find();
  const orphanWallets = wallets.filter((wallet) => !userIds.has(wallet.userId.toString()));
  const negativeWallets = wallets.filter((wallet) =>
    Number(wallet.saldo || 0) < 0 ||
    Number(wallet.saldoBloqueado || 0) < 0 ||
    Number(wallet.comisionPendiente || 0) < 0
  );

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const staleTrips = await Viaje.countDocuments({
    estado: { $in: ["buscando", "ofertando", "reservado", "asignado", "llego", "en_curso"] },
    updatedAt: { $lt: sixHoursAgo },
  });
  const pendingTopups = await Recarga.countDocuments({
    estado: "pendiente",
    createdAt: { $lt: oneHourAgo },
  });

  const report = {
    mode: apply ? "apply" : "dry-run",
    users: userIds.size,
    wallets: wallets.length,
    orphanWallets: orphanWallets.length,
    negativeWallets: negativeWallets.length,
    staleActiveTrips: staleTrips,
    pendingTopupsOlderThanOneHour: pendingTopups,
    normalizedWallets: 0,
  };

  if (apply) {
    for (const wallet of negativeWallets) {
      if (!userIds.has(wallet.userId.toString())) continue;
      if (typeof wallet.normalizarDeudaLegacy === "function" && wallet.normalizarDeudaLegacy()) {
        await wallet.save();
        report.normalizedWallets += 1;
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (orphanWallets.length) {
    console.log("Orphan wallet ids (review manually):");
    orphanWallets.forEach((wallet) => console.log(String(wallet._id)));
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
