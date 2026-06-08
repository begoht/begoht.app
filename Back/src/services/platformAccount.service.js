const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const { PLATFORM_ALIAS, PLATFORM_WALLET_ID } = require("../config/constants");

const PLATFORM_USER_ID = new mongoose.Types.ObjectId(PLATFORM_WALLET_ID);

async function ensurePlatformAccount(session = null) {
  const queryOptions = session ? { session } : {};
  const aliasOwner = await User.findOne({
    alias: PLATFORM_ALIAS,
    _id: { $ne: PLATFORM_USER_ID }
  }).session(session);

  if (aliasOwner) {
    throw new Error(`Alias @${PLATFORM_ALIAS} ya esta usado por otro usuario`);
  }

  let platformUser = await User.findById(PLATFORM_USER_ID).session(session);

  if (!platformUser) {
    const password = await bcrypt.hash(crypto.randomUUID(), 12);

    platformUser = await User.findOneAndUpdate(
      { _id: PLATFORM_USER_ID },
      {
        $setOnInsert: {
          _id: PLATFORM_USER_ID,
          nombre: "BeGO",
          apellido: "App",
          telefono: process.env.PLATFORM_ACCOUNT_PHONE || "509000000000",
          email: process.env.PLATFORM_ACCOUNT_EMAIL || "sistema@bego.com.ht",
          password,
          rol: "admin",
          alias: PLATFORM_ALIAS,
          verificado: true,
          telefonoVerificado: true,
          emailVerificado: true,
          disponible: false,
          online: false,
          saldoBloqueado: false
        }
      },
      { upsert: true, new: true, ...queryOptions }
    );
  } else if (platformUser.alias !== PLATFORM_ALIAS || platformUser.rol !== "admin") {
    platformUser.alias = PLATFORM_ALIAS;
    platformUser.rol = "admin";
    platformUser.verificado = true;
    await platformUser.save({ session });
  }

  const wallet = await Wallet.findOneAndUpdate(
    { userId: PLATFORM_USER_ID },
    {
      $setOnInsert: {
        userId: PLATFORM_USER_ID,
        saldo: 0,
        saldoBloqueado: 0,
        gananciaEfectivo: 0,
        comisionPendiente: 0
      }
    },
    { upsert: true, new: true, ...queryOptions }
  );

  return { user: platformUser, wallet };
}

module.exports = {
  PLATFORM_USER_ID,
  ensurePlatformAccount
};
