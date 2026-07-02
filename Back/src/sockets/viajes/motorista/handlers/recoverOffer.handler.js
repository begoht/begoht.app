const {
  getPendingOfferForDriver,
} = require("../../../../services/matching_services/pendingOfferRecovery.service");

module.exports = (socket, motoristaId) => {
  return async (payload = {}, acknowledge) => {
    if (typeof payload === "function") acknowledge = payload;

    try {
      const oferta = await getPendingOfferForDriver(motoristaId);
      acknowledge?.({ ok: true, oferta });
    } catch (err) {
      console.error("Error recuperando oferta motorista:", err);
      acknowledge?.({ ok: false, oferta: null });
    }
  };
};
