const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const {
  getPendingOfferForDriver,
} = require("../src/services/matching_services/pendingOfferRecovery.service");
const {
  isResendSendOnlyRestriction,
} = require("../src/services/email/email.service");

function fakeRedis(values, ttls = {}) {
  return {
    async get(key) {
      return values[key] ?? null;
    },
    async pttl(key) {
      return ttls[key] ?? -2;
    },
  };
}

test("recupera una sola oferta usando lock, estado y TTL reales", async () => {
  const now = 1_000_000;
  const driverId = "driver-1";
  const viajeId = "trip-1";
  const offerKey = `viaje:oferta:pendiente:${viajeId}:${driverId}`;
  const client = fakeRedis({
    [`lock:oferta:motorista:${driverId}`]: viajeId,
    [`viaje:status:${viajeId}`]: "ofertando",
    [offerKey]: JSON.stringify({ viajeId, expira: now + 8000, precio: 500 }),
  }, { [offerKey]: 6200 });

  const offer = await getPendingOfferForDriver(driverId, { client, now });

  assert.equal(offer.viajeId, viajeId);
  assert.equal(offer.ttl, 6200);
  assert.equal(offer.isRecovery, true);
});

test("no revive ofertas vencidas, cerradas o sin lock", async () => {
  const now = 2_000_000;
  const driverId = "driver-2";
  const viajeId = "trip-2";
  const offerKey = `viaje:oferta:pendiente:${viajeId}:${driverId}`;
  const base = {
    [`lock:oferta:motorista:${driverId}`]: viajeId,
    [offerKey]: JSON.stringify({ viajeId, expira: now - 1 }),
    [`viaje:status:${viajeId}`]: "ofertando",
  };

  assert.equal(await getPendingOfferForDriver(driverId, {
    client: fakeRedis(base, { [offerKey]: 5000 }), now,
  }), null);

  assert.equal(await getPendingOfferForDriver(driverId, {
    client: fakeRedis({ ...base, [offerKey]: JSON.stringify({ viajeId, expira: now + 5000 }), [`viaje:status:${viajeId}`]: "aceptado" }, { [offerKey]: 5000 }), now,
  }), null);

  assert.equal(await getPendingOfferForDriver(driverId, {
    client: fakeRedis({}, {}), now,
  }), null);
});

test("la app solicita recovery al arrancar, reconectar, volver y abrir el push", () => {
  const root = path.resolve(__dirname, "..", "..");
  const recovery = fs.readFileSync(path.join(root, "front-driver/www/js/modules/oferta/oferta.recovery.js"), "utf8");
  const notifications = fs.readFileSync(path.join(root, "front-driver/www/js/modules/notifications.js"), "utf8");

  assert.match(recovery, /reason: "startup"/);
  assert.match(recovery, /reason: "socket-connect"/);
  assert.match(recovery, /appStateChange/);
  assert.match(recovery, /visibilitychange/);
  assert.match(notifications, /reason: "push-opened"/);
  assert.match(notifications, /reason: "local-push-opened"/);
});

test("solicitudes simultaneas comparten recovery y publican una sola oferta", async () => {
  const recoveryPath = path.resolve(
    __dirname,
    "../../front-driver/www/js/modules/oferta/oferta.recovery.js"
  );
  const source = fs.readFileSync(recoveryPath, "utf8");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

  const previousWindow = global.window;
  const previousCustomEvent = global.CustomEvent;
  global.window = new EventTarget();
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  };

  let emitted = 0;
  let published = 0;
  global.window.addEventListener("driver:offer-recovered", () => published++);
  const socket = {
    connected: true,
    emit(event, payload, acknowledge) {
      emitted++;
      setImmediate(() => acknowledge({
        ok: true,
        oferta: { viajeId: "trip-dedup", expira: Date.now() + 5000 },
      }));
    },
  };

  try {
    const recovery = await import(`${moduleUrl}#${pathToFileURL(recoveryPath).href}`);
    await Promise.all([
      recovery.recoverPendingOffer(socket, { force: true }),
      recovery.recoverPendingOffer(socket, { force: true }),
    ]);

    assert.equal(emitted, 1);
    assert.equal(published, 1);
  } finally {
    global.window = previousWindow;
    global.CustomEvent = previousCustomEvent;
  }
});

test("readiness acepta una clave Resend restringida de forma segura a envios", () => {
  assert.equal(
    isResendSendOnlyRestriction("This API key is restricted to only send emails"),
    true
  );
  assert.equal(isResendSendOnlyRestriction("Resend domains API 503"), false);
});
