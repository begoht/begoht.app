const cancelService = require("../services/cancel.service");

module.exports = async function(socket, io, data) {
    await cancelService(socket, io, data);
};