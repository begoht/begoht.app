const Wallet = require("../../../../models/Wallet");

module.exports = {

  findByUser(userId, session = null) {
    return Wallet.findOne({ userId }).session(session);
  },

  save(wallet, session = null) {
    return wallet.save({ session });
  }

};