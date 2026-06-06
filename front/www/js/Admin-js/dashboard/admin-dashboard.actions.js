// Admin dashboard privileged mutations and reassignment actions.
    async function changeRole(id) {
      const rol = prompt("Nuevo rol: pasajero, motorista o admin");
      if (!["pasajero", "motorista", "admin"].includes(rol)) return;
      await api(`/api/admin/usuarios/${id}/rol`, { method: "PUT", body: { rol } });
      await loadAll();
      showToast("Rol actualizado");
    }

    async function toggleBlock(id, blocked) {
      await api(`/api/admin/usuarios/${id}/bloqueo`, { method: "PUT", body: { saldoBloqueado: !blocked } });
      await loadAll();
      showToast(blocked ? "Usuario desbloqueado" : "Usuario bloqueado");
    }

    async function toggleVerify(id, verified) {
      await api(`/api/admin/usuarios/${id}/verificacion`, { method: "PUT", body: { verificado: !verified } });
      await loadAll();
      showToast(verified ? "Verificacion retirada" : "Usuario verificado");
    }

    async function toggleAvailability(id, disponible) {
      await api(`/api/admin/usuarios/${id}/disponibilidad`, { method: "PUT", body: { disponible: !disponible } });
      await loadAll();
      showToast(disponible ? "Motorista pausado" : "Motorista activado");
    }

    async function payWithdraw(id) {
      if (!confirm("Marcar este retiro como pagado?")) return;
      await api(`/api/admin/retiros/${id}/pagar`, { method: "POST" });
      await loadAll();
      showToast("Retiro marcado como pagado");
    }

    async function reassignTrip(id, defaultReason = "Motorista demora en llegar") {
      const motivo = prompt("Motivo de reasignacion", defaultReason);
      if (motivo === null) return;
      if (!confirm("Reasignar este viaje a otro motorista? El motorista actual sera excluido de esta oferta.")) return;

      try {
        await api(`/api/admin/viajes/${id}/reasignar`, {
          method: "POST",
          body: { motivo }
        });
        await loadAll();
        showToast("Viaje enviado a reasignacion");
      } catch (err) {
        console.error(err);
        showToast("No se pudo reasignar el viaje");
      }
    }

    async function executeDelayReassignment() {
      const total = Number(state.delayReassignment?.total || state.delayReassignment?.viajes?.length || 0);
      if (!total) {
        showToast("No hay demoras para reasignar");
        return;
      }

      if (!confirm(`Reasignar ${total} viaje(s) demorados? Cada motorista actual sera excluido de su oferta.`)) return;

      try {
        const result = await api("/api/admin/viajes/reasignacion-demora/ejecutar", {
          method: "POST",
          body: { motivo: "demora_motorista", limit: 50 }
        });
        await loadAll();
        showToast(`Reasignados ${result.reasignados || 0} de ${result.total || 0}`);
      } catch (err) {
        console.error(err);
        showToast("No se pudo ejecutar la reasignacion por demora");
      }
    }

Object.assign(window, {
  changeRole,
  toggleBlock,
  toggleVerify,
  toggleAvailability,
  payWithdraw,
  reassignTrip,
  executeDelayReassignment,
  logout,
});
