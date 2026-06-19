const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const User = require("../src/models/User");
const EmailVerification = require("../src/models/EmailVerification");
const authRoutes = require("../src/routes/auth");
const driverAuthRoutes = require("../src/routes/driver.auth");
const emergencyRoutes = require("../src/routes/emergency");
const usersRoutes = require("../src/routes/users");

function routeContracts(router) {
  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map((method) => ({
        method: method.toUpperCase(),
        path: layer.route.path,
      }))
    );
}

function readWorkspaceFile(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

test("las cuentas motoristas requieren verificacion explicita", () => {
  assert.equal(User.schema.path("verificado").options.default, false);
  assert.ok(User.schema.path("verificadoAt"));
  assert.ok(User.schema.path("verificadoPor"));
  assert.ok(User.schema.path("activo"));
  assert.ok(User.schema.path("deletedAt"));
});

test("los codigos distinguen registro y recuperacion de contraseña", () => {
  const values = EmailVerification.schema.path("purpose").options.enum;
  assert.deepEqual(values, ["register", "password_reset"]);
});

test("existen endpoints de recuperacion, cierre y eliminacion", () => {
  const passenger = routeContracts(authRoutes);
  const driver = routeContracts(driverAuthRoutes);
  const users = routeContracts(usersRoutes);

  assert.ok(passenger.some((route) => route.method === "POST" && route.path === "/password/forgot"));
  assert.ok(passenger.some((route) => route.method === "POST" && route.path === "/password/reset"));
  assert.ok(passenger.some((route) => route.method === "POST" && route.path === "/logout"));
  assert.ok(driver.some((route) => route.method === "POST" && route.path === "/password/forgot"));
  assert.ok(driver.some((route) => route.method === "POST" && route.path === "/password/reset"));
  assert.ok(driver.some((route) => route.method === "POST" && route.path === "/logout"));
  assert.ok(users.some((route) => route.method === "DELETE" && route.path === "/account"));
});

test("SOS dispone de un endpoint autenticado", () => {
  const routes = routeContracts(emergencyRoutes);
  assert.ok(routes.some((route) => route.method === "POST" && route.path === "/"));
});

test("Home y landing utilizan el color oficial", () => {
  const variables = readWorkspaceFile("front/www/css/base/variables.css");
  const home = readWorkspaceFile("front/www/css/busqueda/busqueda.css");
  const landing = readWorkspaceFile("front/www/modules/landing/landing.css");

  assert.match(variables, /--bg-main:\s*#020616/i);
  assert.match(home, /body\.route-home[\s\S]*background-color:\s*#020616/i);
  assert.match(landing, /--bg:\s*#020616/i);
});

test("el mapa pasajero mantiene origen, destino y guardado compatibles con Android", () => {
  const geo = readWorkspaceFile("front/www/js/map/map.geo.js");
  const destino = readWorkspaceFile("front/www/js/map/map.destino.js");
  const guardados = readWorkspaceFile("front/www/js/map/map.saved-destinations.js");
  const css = readWorkspaceFile("front/www/css/busqueda/busqueda.css");

  assert.doesNotMatch(geo, /replaceAll\(/);
  assert.doesNotMatch(destino, /replaceAll\(/);
  assert.match(geo, /startsWithNumber/);
  assert.match(destino, /startsWithNumber/);
  assert.match(guardados, /destinosFab/);
  assert.doesNotMatch(guardados, /destinosInlineSave|destinosSave/);
  assert.doesNotMatch(css, /destinos-inline-save/);
});

test("la app motorista muestra la divulgacion antes del permiso GPS", () => {
  const html = readWorkspaceFile("front-driver/www/index.html");
  const gps = readWorkspaceFile("front-driver/www/js/modules/gps.js");

  assert.match(html, /id="driverLocationDisclosure"/);
  assert.match(html, /en arrière-plan/i);
  assert.match(gps, /await ensureLocationDisclosure\(\)/);
  assert.ok(
    gps.indexOf("await ensureLocationDisclosure()") <
      gps.indexOf("startBackgroundGeolocation()")
  );
});

test("cada formulario registra una sola accion principal de alta", () => {
  const passenger = readWorkspaceFile("front/www/js/registro.js");
  const driver = readWorkspaceFile("front-driver/www/js/auth/registro.js");

  assert.equal((passenger.match(/btnRegistro\?*\.addEventListener\("click"/g) || []).length, 1);
  assert.equal((driver.match(/btnRegistro\.addEventListener\("click"/g) || []).length, 1);
});
