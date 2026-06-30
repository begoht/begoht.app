const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const notificationRoutes = require("../src/routes/notifications");
const AppNotification = require("../src/models/AppNotification");
const PushDevice = require("../src/models/PushDevice");

function routeContracts(router) {
  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods).map((method) => ({
      method: method.toUpperCase(),
      path: layer.route.path,
    })));
}

function readWorkspaceFile(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

test("noticias ofrece registro de dispositivo, bandeja y envio admin", () => {
  const routes = routeContracts(notificationRoutes);
  assert.ok(routes.some((route) => route.method === "POST" && route.path === "/notifications/devices"));
  assert.ok(routes.some((route) => route.method === "DELETE" && route.path === "/notifications/devices"));
  assert.ok(routes.some((route) => route.method === "GET" && route.path === "/notifications/news"));
  assert.ok(routes.some((route) => route.method === "GET" && route.path === "/admin/notifications"));
  assert.ok(routes.some((route) => route.method === "POST" && route.path === "/admin/notifications"));
});

test("modelos limitan audiencias y guardan tokens por rol", () => {
  assert.deepEqual(AppNotification.schema.path("audience").options.enum, ["pasajeros", "motoristas", "todos"]);
  assert.deepEqual(PushDevice.schema.path("role").options.enum, ["pasajero", "motorista"]);
  assert.equal(PushDevice.schema.path("token").options.unique, true);
});

test("admin y ambas apps exponen sus bandejas de noticias", () => {
  const admin = readWorkspaceFile("front/www/paginas/admin-dashboard.html");
  const passengerRoutes = readWorkspaceFile("front/www/js/core/router/router.routes.js");
  const passengerPush = readWorkspaceFile("front/www/js/notifications/notifications.js");
  const driver = readWorkspaceFile("front-driver/www/index.html");
  const driverSpa = readWorkspaceFile("front-driver/www/js/modules/driver.spa.js");
  const driverPush = readWorkspaceFile("front-driver/www/js/modules/notifications.js");
  const dispatch = readWorkspaceFile("Back/src/services/matching_services/despacho/despacho.envio.js");

  assert.match(admin, /id="section-news"/);
  assert.match(admin, /id="adminNotificationForm"/);
  assert.match(admin, /value="pasajeros"/);
  assert.match(admin, /value="motoristas"/);
  assert.match(admin, /value="todos"/);
  assert.match(passengerRoutes, /"\/noticias"/);
  assert.match(passengerPush, /PushNotifications/);
  assert.match(driver, /href="#\/noticias"/);
  assert.match(driverSpa, /"\/noticias"/);
  assert.match(driverPush, /bego-trips/);
  assert.match(dispatch, /sendTripOfferPush/);
});
