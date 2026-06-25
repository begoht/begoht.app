// Admin dashboard user rendering by role.
function renderUsers() {
  const pasajeros = filtrarUsuariosPorRol("pasajero");
  const motoristas = filtrarUsuariosPorRol("motorista");
  const admins = filtrarUsuariosPorRol("admin");

  setText("passengerUserCount", pasajeros.length);
  setText("driverUserCount", motoristas.length);
  setText("adminUserCount", admins.length);

  setRows("passengerRows", pasajeros, 6, "No hay pasajeros para mostrar", passengerUserRow);
  setRows("driverRows", motoristas, 7, "No hay motoristas para mostrar", driverUserRow);
  setRows("adminRows", admins, 5, "No hay admins para mostrar", adminUserRow);
}

function filtrarUsuariosPorRol(rol) {
  return filterRows(
    (state.usuarios || []).filter((user) => normalizarRolUsuario(user) === rol),
    userSearchText
  );
}

function normalizarRolUsuario(user = {}) {
  return String(user.rol || "pasajero").toLowerCase();
}

function passengerUserRow(user) {
  return row([
    cell("Pasajero", userIdentityCell(user)),
    cell("Contacto", userContactCell(user)),
    cell("Estado", userBlockStatus(user)),
    cell("Verificado", userVerifiedStatus(user)),
    cell("Alta", formatDate(user.createdAt)),
    cell("Acciones", userActions(user, { availability: false }))
  ]);
}

function driverUserRow(user) {
  return row([
    cell("Motorista", userIdentityCell(user)),
    cell("Contacto", userContactCell(user)),
    cell("Verificado", userVerifiedStatus(user)),
    cell("Estado app", driverAvailabilityCell(user)),
    cell("Rating", `${Number(user.rating || 0).toFixed(1)} / 5`),
    cell("Alta", formatDate(user.createdAt)),
    cell("Acciones", userActions(user, { availability: true }))
  ]);
}

function adminUserRow(user) {
  return row([
    cell("Admin", userIdentityCell(user)),
    cell("Contacto", userContactCell(user)),
    cell("Estado", userBlockStatus(user)),
    cell("Alta", formatDate(user.createdAt)),
    cell("Acciones", userActions(user, { verify: false, availability: false }))
  ]);
}

function userIdentityCell(user) {
  return `
    <span class="row-main">${escapeHtml(fullName(user) || "Usuario")}</span>
    <span class="row-sub">${escapeHtml(user.alias || shortId(user._id))}</span>
  `;
}

function userContactCell(user) {
  return `
    <span class="row-main">${escapeHtml(user.telefono || "-")}</span>
    <span class="row-sub">${escapeHtml(user.email || "")}</span>
  `;
}

function userBlockStatus(user) {
  return user.saldoBloqueado
    ? `<span class="status bloqueado">Bloqueado</span>`
    : `<span class="status activo">Activo</span>`;
}

function userVerifiedStatus(user) {
  return user.verificado
    ? `<span class="status verificado">Verificado</span>`
    : `<span class="status pendiente">Pendiente</span>`;
}

function driverAvailabilityCell(user) {
  return `
    ${user.online ? `<span class="status online">Online</span>` : `<span class="status offline">Offline</span>`}
    <span class="row-sub">${user.disponible ? "Disponible" : "No disponible"}</span>
  `;
}

function userActions(user, { verify = true, availability = false } = {}) {
  return `
    <div class="actions">
      <button class="btn small secondary" type="button" onclick="changeRole('${user._id}')">
        <i class="fa-solid fa-user-gear"></i>Rol
      </button>
      <button class="btn small ${user.saldoBloqueado ? "good" : "danger"}" type="button" onclick="toggleBlock('${user._id}', ${!!user.saldoBloqueado})">
        ${user.saldoBloqueado ? "Desbloquear" : "Bloquear"}
      </button>
      ${verify ? `<button class="btn small blue" type="button" onclick="toggleVerify('${user._id}', ${!!user.verificado})">${user.verificado ? "Quitar check" : "Verificar"}</button>` : ""}
      ${availability ? `<button class="btn small warn" type="button" onclick="toggleAvailability('${user._id}', ${!!user.disponible})">${user.disponible ? "Pausar" : "Activar"}</button>` : ""}
    </div>
  `;
}
