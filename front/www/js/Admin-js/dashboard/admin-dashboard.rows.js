// Admin dashboard table row renderers.
    function userRow(user) {
      const isDriver = user.rol === "motorista";
      return row([
        cell("Usuario", `<span class="row-main">${escapeHtml(fullName(user))}</span><span class="row-sub">${escapeHtml(user.alias || shortId(user._id))}</span>`),
        cell("Contacto", `${escapeHtml(user.telefono || "-")}<span class="row-sub">${escapeHtml(user.email || "")}</span>`),
        cell("Rol", `<span class="status">${escapeHtml(user.rol || "-")}</span>`),
        cell("Estado", user.saldoBloqueado ? `<span class="status bloqueado">Bloqueado</span>` : `<span class="status activo">Activo</span>`),
        cell("Verificado", user.verificado ? `<span class="status verificado">Verificado</span>` : `<span class="status pendiente">Pendiente</span>`),
        cell("Motorista", isDriver ? `${user.online ? `<span class="status online">Online</span>` : `<span class="status offline">Offline</span>`}<span class="row-sub">${user.disponible ? "Disponible" : "No disponible"} - ${Number(user.rating || 0).toFixed(1)} estrellas</span>` : "-"),
        cell("Alta", formatDate(user.createdAt)),
        cell("Acciones", `
          <div class="actions">
            <button class="btn small secondary" type="button" onclick="changeRole('${user._id}')"><i class="fa-solid fa-user-gear"></i>Rol</button>
            <button class="btn small ${user.saldoBloqueado ? "good" : "danger"}" type="button" onclick="toggleBlock('${user._id}', ${!!user.saldoBloqueado})">${user.saldoBloqueado ? "Desbloquear" : "Bloquear"}</button>
            <button class="btn small blue" type="button" onclick="toggleVerify('${user._id}', ${!!user.verificado})">${user.verificado ? "Quitar check" : "Verificar"}</button>
            ${isDriver ? `<button class="btn small warn" type="button" onclick="toggleAvailability('${user._id}', ${!!user.disponible})">${user.disponible ? "Pausar" : "Activar"}</button>` : ""}
          </div>
        `)
      ]);
    }

    function tripRow(trip, mode = {}) {
      if (mode.full) {
        return row([
          cell("Viaje", `<span class="row-main">${shortId(trip._id)}</span><span class="row-sub">${escapeHtml(routeText(trip))}</span>`),
          cell("Tipo", `<span class="status">${formatType(trip.tipo || "viaje")}</span>`),
          cell("Estado", `<span class="status ${cssToken(trip.estado)}">${formatType(trip.estado)}</span>`),
          cell("Pasajero", personCell(trip.pasajero)),
          cell("Motorista", personCell(trip.motorista)),
          cell("Total", `<span class="money">${money(trip.precio)}</span>`),
          cell("Motorista", `<span class="money good">${money(trip.pagoMotorista || trip.paBeGOrista)}</span>`),
          cell("Comision", `<span class="money warn">${money(trip.comision)}</span>`),
          cell("Pago", `<span class="status ${cssToken(trip.estadoPago)}">${formatType(trip.estadoPago || "-")}</span>`),
          cell("Fecha", formatDate(trip.finViajeAt || trip.createdAt)),
          cell("Accion", reassignAction(trip))
        ]);
      }

      return row([
        cell("Viaje", `<span class="row-main">${shortId(trip._id)}</span><span class="row-sub">${escapeHtml(routeText(trip))}</span>`),
        cell("Tipo", `<span class="status">${formatType(trip.tipo || "viaje")}</span>`),
        cell("Estado", `<span class="status ${cssToken(trip.estado)}">${formatType(trip.estado)}</span>`),
        cell("Pasajero", personCell(trip.pasajero)),
        cell("Motorista", personCell(trip.motorista)),
        cell("Monto", `<span class="money">${money(trip.precio)}</span>`),
        cell("Pago", `<span class="status ${cssToken(trip.estadoPago)}">${formatType(trip.estadoPago || "-")}</span>`),
        cell("Ciudad", escapeHtml(trip.ciudad || "-")),
        cell("Actualizado", formatDate(trip.updatedAt || trip.createdAt)),
        cell("Accion", reassignAction(trip))
      ]);
    }

    function packageRow(trip) {
      const pkg = trip.paquete || {};
      return row([
        cell("Envio", `<span class="row-main">${shortId(trip._id)}</span><span class="row-sub">${escapeHtml(pkg.descripcion || routeText(trip))}</span>`),
        cell("Estado", `<span class="status ${cssToken(trip.estado)}">${formatType(trip.estado)}</span>`),
        cell("Pasajero", personCell(trip.pasajero)),
        cell("Motorista", personCell(trip.motorista)),
        cell("Peso", `${pkg.pesoKg ?? "-"} kg`),
        cell("Codigo", `<span class="row-main">${pkg.codigoEntrega || "----"}</span>`),
        cell("Confirmado", pkg.codigoEntregaConfirmadoAt ? `<span class="status activo">Confirmado</span>` : `<span class="status pendiente">Pendiente</span>`),
        cell("Fecha", formatDate(trip.createdAt))
      ]);
    }

    function walletRow(wallet) {
      const user = wallet.userId || {};
      const saldo = Number(wallet.saldo || 0);
      const last = [...(wallet.movimientos || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
      return row([
        cell("Usuario", personCell(user, wallet._id)),
        cell("Rol", escapeHtml(user.rol || "-")),
        cell("Saldo", `<span class="money ${saldo < 0 ? "bad" : "good"}">${money(saldo)}</span>`),
        cell("Retenido", `<span class="money warn">${money(wallet.saldoBloqueado)}</span>`),
        cell("Estado", saldo < 0 ? `<span class="status deuda">Deuda</span>` : `<span class="status activo">Al dia</span>`),
        cell("Movimiento", last ? `${escapeHtml(formatType(last.tipo))}<span class="row-sub">${formatDate(last.fecha)}</span>` : "-")
      ]);
    }

    function platformMovementRow(movimiento) {
      const amount = Number(movimiento.monto || 0);
      return row([
        cell("Movimiento", `<span class="row-main">${shortId(movimiento._id || movimiento.ref)}</span><span class="row-sub">${escapeHtml(movimiento.descripcion || "Comision recibida")}</span>`),
        cell("Tipo", `<span class="status activo">${formatType(movimiento.tipo)}</span>`),
        cell("Monto", `<span class="money ${amount >= 0 ? "good" : "bad"}">${money(amount)}</span>`),
        cell("Referencia", escapeHtml(movimiento.ref || "-")),
        cell("Fecha", formatDate(movimiento.fecha))
      ]);
    }

    function withdrawRow(retiro) {
      const user = retiro.userId || {};
      const pending = retiro.estado === "pendiente";
      return row([
        cell("Usuario", personCell(user)),
        cell("Metodo", `<span class="status">${escapeHtml(retiro.metodo || "-")}</span><span class="row-sub">${escapeHtml(retiro.telefono || "")}</span>`),
        cell("Monto", `<span class="money warn">${money(retiro.monto)}</span>`),
        cell("Estado", `<span class="status ${cssToken(retiro.estado)}">${formatType(retiro.estado)}</span>`),
        cell("Fecha", formatDate(retiro.creado || retiro.createdAt)),
        cell("Accion", pending ? `<button class="btn small good" type="button" onclick="payWithdraw('${retiro._id}')"><i class="fa-solid fa-check"></i>Pagar</button>` : "-")
      ]);
    }

    function creditRow(item) {
      const driver = item.motorista || {};
      const montoEstimado = roundCredit((Number(item.ingresoMotorista || 0) / Math.max(1, item.viajesFinalizados || 1)) * 45);
      return row([
        cell("Motorista", personCell(driver, item._id)),
        cell("Viajes", `<span class="row-main">${item.viajesFinalizados || 0}</span><span class="row-sub">Elegible desde 1000</span>`),
        cell("Ingreso", `<span class="money good">${money(item.ingresoMotorista)}</span>`),
        cell("Rating", `${Number(driver.rating || 0).toFixed(1)} / 5`),
        cell("Estado app", `${driver.online ? `<span class="status online">Online</span>` : `<span class="status offline">Offline</span>`}<span class="row-sub">${driver.disponible ? "Disponible" : "Pausado"}</span>`),
        cell("Ultimo viaje", formatDate(item.ultimoViaje)),
        cell("Accion", `<span class="status preaprobado">Estimado ${money(montoEstimado)}</span>`)
      ]);
    }

    function reservationRow(trip) {
      return row([
        cell("Reserva", `<span class="row-main">${shortId(trip._id)}</span><span class="row-sub">${escapeHtml(routeText(trip))}</span>`),
        cell("Pasajero", personCell(trip.pasajero)),
        cell("Motorista", personCell(trip.motorista)),
        cell("Ciudad", escapeHtml(trip.ciudad || "-")),
        cell("Pago", `<span class="status ${cssToken(trip.metodoPago)}">${formatType(trip.metodoPago)}</span>`),
        cell("Creada", formatDate(trip.reservadoEn || trip.createdAt)),
        cell("Accion", reassignAction(trip))
      ]);
    }

    function delayReassignRow(trip) {
      const demora = trip.demora || {};
      return row([
        cell("Viaje", `<span class="row-main">${shortId(trip._id)}</span><span class="row-sub">${escapeHtml(routeText(trip))}</span>`),
        cell("Estado", `<span class="status ${cssToken(trip.estado)}">${formatType(trip.estado)}</span>`),
        cell("Pasajero", personCell(trip.pasajero)),
        cell("Motorista", personCell(trip.motorista)),
        cell("Demora", `<span class="row-main">${Number(demora.minutos || 0)} min</span><span class="row-sub">Exceso ${Number(demora.excesoMinutos || 0)} min</span>`),
        cell("Umbral", `<span class="status warning">${Number(demora.umbralMinutos || 0)} min</span><span class="row-sub">${formatDate(demora.desde)}</span>`),
        cell("Accion", `
          <button class="btn small warn" type="button" onclick="reassignTrip('${trip._id}', 'Motorista demora en llegar')">
            <i class="fa-solid fa-rotate"></i>Reasignar
          </button>
        `)
      ]);
    }

    function reassignAction(trip) {
      if (!["asignado", "llego", "reservado"].includes(trip.estado)) return "-";
      return `
        <button class="btn small warn" type="button" onclick="reassignTrip('${trip._id}')">
          <i class="fa-solid fa-rotate"></i>Reasignar
        </button>
      `;
    }
