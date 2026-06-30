const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readWorkspaceFile(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

test("admin dashboard separa usuarios por responsabilidad y rol", () => {
  const html = readWorkspaceFile("front/www/paginas/admin-dashboard.html");
  const users = readWorkspaceFile("front/www/js/Admin-js/dashboard/admin-dashboard.users.js");
  const render = readWorkspaceFile("front/www/js/Admin-js/dashboard/admin-dashboard.render.js");
  const rows = readWorkspaceFile("front/www/js/Admin-js/dashboard/admin-dashboard.rows.js");

  assert.match(html, /admin-dashboard\.users\.js\?v=20260625-admin-roles/);
  assert.match(html, /id="passengerRows"/);
  assert.match(html, /id="driverRows"/);
  assert.match(html, /id="adminRows"/);
  assert.doesNotMatch(html, /id="userRows"/);

  assert.match(users, /function renderUsers\(\)/);
  assert.match(users, /filtrarUsuariosPorRol\("pasajero"\)/);
  assert.match(users, /filtrarUsuariosPorRol\("motorista"\)/);
  assert.match(users, /filtrarUsuariosPorRol\("admin"\)/);
  assert.match(users, /passengerUserRow/);
  assert.match(users, /driverUserRow/);
  assert.match(users, /adminUserRow/);
  assert.doesNotMatch(render, /function renderUsers\(\)/);
  assert.doesNotMatch(rows, /function userRow\(/);
});

test("admin dashboard usa el fondo oscuro de BeGO desde CSS dedicado", () => {
  const html = readWorkspaceFile("front/www/paginas/admin-dashboard.html");
  const css = readWorkspaceFile("front/www/css/admin-dashboard.css");
  const utils = readWorkspaceFile("front/www/js/Admin-js/dashboard/admin-dashboard.utils.js");

  assert.match(html, /css\/admin-dashboard\.css\?v=20260629-news-push/);
  assert.match(css, /--bg:\s*#020616/);
  assert.match(css, /linear-gradient\(180deg,\s*#020616/);
  assert.match(css, /\.topbar,\s*\n\.kpi-card,\s*\n\.panel/);
  assert.match(css, /\.admin-users-panel/);
  assert.match(utils, /legend:\s*{\s*labels:\s*{[^}]*color:\s*"#cbd5e1"/);
});
