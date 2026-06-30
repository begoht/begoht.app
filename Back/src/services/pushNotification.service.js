const PushDevice = require("../models/PushDevice");

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

let firebaseAdmin = null;
let firebaseInitAttempted = false;
let firebaseInitError = "";

function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  if (firebaseInitAttempted) return null;
  firebaseInitAttempted = true;

  try {
    const admin = require("firebase-admin");
    if (!admin.apps.length) {
      const rawCredentials = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
      admin.initializeApp({
        credential: rawCredentials
          ? admin.credential.cert(JSON.parse(rawCredentials))
          : admin.credential.applicationDefault(),
      });
    }
    firebaseAdmin = admin;
    return firebaseAdmin;
  } catch (error) {
    firebaseInitError = error?.message || "Firebase no disponible";
    console.warn("Push Firebase desactivado:", firebaseInitError);
    return null;
  }
}

async function registerPushDevice({ userId, role, token, app, platform }) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken || cleanToken.length > 4096) {
    const error = new Error("Token push invalido");
    error.status = 400;
    throw error;
  }

  return PushDevice.findOneAndUpdate(
    { token: cleanToken },
    {
      $set: {
        user: userId,
        role,
        app,
        platform: normalizePlatform(platform),
        active: true,
        lastSeenAt: new Date(),
        lastError: "",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function unregisterPushDevice({ userId, token }) {
  await PushDevice.updateOne(
    { user: userId, token: String(token || "").trim() },
    { $set: { active: false, lastSeenAt: new Date() } }
  );
}

async function sendNewsPush({ audience, title, message, notificationId }) {
  const roles = audience === "todos"
    ? ["pasajero", "motorista"]
    : [audience === "motoristas" ? "motorista" : "pasajero"];
  const devices = await PushDevice.find({ role: { $in: roles }, active: true })
    .select("token").lean();

  return sendToDevices(devices, {
    title,
    body: message,
    data: { type: "news", notificationId: String(notificationId || "") },
    channelId: "bego-news",
    collapseKey: `bego-news-${notificationId}`,
    ttlSeconds: 7 * 24 * 60 * 60,
  });
}

async function sendTripOfferPush(motoristaId, offer = {}) {
  const devices = await PushDevice.find({
    user: motoristaId,
    role: "motorista",
    active: true,
  }).select("token").lean();

  const pickup = shortAddress(offer?.origen?.direccion || offer?.origen?.nombre || "Punto de recogida");
  const destination = shortAddress(offer?.destino?.direccion || offer?.destino?.nombre || "Destino");
  const earning = Number(offer?.gananciaMotorista ?? offer?.netoMotorista ?? offer?.precio ?? 0);
  const body = `${pickup} - ${destination}${earning > 0 ? ` | ${Math.round(earning)} G` : ""}`;
  const ttlMs = Math.max(1000, Number(offer?.ttl || offer?.expira - Date.now() || 15000));

  return sendToDevices(devices, {
    title: "Nuevo viaje disponible",
    body,
    data: {
      type: "trip_offer",
      viajeId: String(offer?.viajeId || ""),
      expira: String(offer?.expira || Date.now() + ttlMs),
    },
    channelId: "bego-trips",
    collapseKey: `bego-trip-${offer?.viajeId || "offer"}`,
    ttlSeconds: Math.max(1, Math.min(30, Math.ceil(ttlMs / 1000))),
  });
}

async function sendToDevices(devices, { title, body, data, channelId, collapseKey, ttlSeconds }) {
  const tokens = [...new Set((devices || []).map((item) => item.token).filter(Boolean))];
  const admin = getFirebaseAdmin();

  if (!tokens.length) {
    return { devices: 0, sent: 0, failed: 0, pushAvailable: !!admin };
  }
  if (!admin) {
    return {
      devices: tokens.length,
      sent: 0,
      failed: tokens.length,
      pushAvailable: false,
      error: firebaseInitError,
    };
  }

  let sent = 0;
  let failed = 0;
  for (let start = 0; start < tokens.length; start += 500) {
    const batchTokens = tokens.slice(start, start + 500);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: batchTokens,
      notification: { title, body },
      data: stringifyData(data),
      android: {
        priority: "high",
        ttl: Math.max(1, ttlSeconds) * 1000,
        collapseKey,
        notification: {
          channelId,
          priority: "high",
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: "public",
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { sound: "default" } },
      },
    });

    sent += response.successCount;
    failed += response.failureCount;
    const invalidTokens = [];
    const failures = [];
    response.responses.forEach((item, index) => {
      if (item.success) return;
      const token = batchTokens[index];
      const code = item.error?.code || "messaging/unknown-error";
      if (INVALID_TOKEN_CODES.has(code)) invalidTokens.push(token);
      failures.push({ token, code });
    });

    if (invalidTokens.length) {
      await PushDevice.updateMany(
        { token: { $in: invalidTokens } },
        { $set: { active: false, lastError: "Token FCM expirado" } }
      );
    }
    await Promise.all(failures
      .filter((failure) => !INVALID_TOKEN_CODES.has(failure.code))
      .slice(0, 50)
      .map((failure) => PushDevice.updateOne(
        { token: failure.token },
        { $set: { lastError: failure.code.slice(0, 240) } }
      )));
  }

  return { devices: tokens.length, sent, failed, pushAvailable: true };
}

function stringifyData(data = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value ?? "")])
  );
}

function normalizePlatform(value) {
  const platform = String(value || "unknown").toLowerCase();
  return ["android", "ios", "web"].includes(platform) ? platform : "unknown";
}

function shortAddress(value) {
  return String(value || "").split(",")[0].trim().slice(0, 60);
}

module.exports = {
  registerPushDevice,
  unregisterPushDevice,
  sendNewsPush,
  sendTripOfferPush,
};
