const admin = require("firebase-admin");

if (!admin.apps.length) {
  const rawCredentials = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  admin.initializeApp({
    credential: rawCredentials
      ? admin.credential.cert(JSON.parse(rawCredentials))
      : admin.credential.applicationDefault(),
  });
}

module.exports = admin;
