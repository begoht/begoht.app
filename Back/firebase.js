const admin = require("firebase-admin");

const serviceAccount = require("./firebase-key.json"); 
// (descargado de Firebase → Service Accounts)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
