// Admin dashboard section renderers.
    function renderAll() {
      renderMetrics();
      renderNavCounts();
      renderCharts();
      renderActiveTrips();
      renderUsers();
      renderDelayReassignment();
      renderTrips();
      renderPackages();
      renderPlatformWallet();
      renderCommission();
      renderBaseFare();
      renderWalletDiscount();
      renderPaymentMethods();
      renderWallets();
      renderWithdraws();
      renderCredits();
      renderOps();
      renderReservations();
      renderMonitoring();
      renderLaunch();
    }

    function renderMetrics() {
      const metricas = state.resumen?.metricas || {};
      const usuarios = state.resumen?.usuarios || {};
      const blocked = state.usuarios.filter((u) => u.saldoBloqueado).length;

      setText("mOnline", metricas.usuariosOnline || 0);
      setText("mTripsToday", metricas.viajesHoy || 0);
      setText("mCharged", money(metricas.totalCobrado));
      setText("mDriversReady", metricas.motoristasDisponibles || 0);
      setText("mPassengers", usuarios.pasajero || 0);
      setText("mDrivers", usuarios.motorista || 0);
      setText("mAdmins", usuarios.admin || 0);
      setText("mBlocked", blocked);
      setText("mPackagesActive", metricas.paquetesActivos || 0);
      setText("mReservations", metricas.reservasActivas || 0);
      setText("mCommission", money(metricas.totalComision));
      setText("mCommissionRateLabel", `${formatPercent(currentCommissionPercent())} activo`);
      setText("mPlatformWallet", money(metricas.walletPlataforma));
      setText("mPlatformHeld", `${money(metricas.walletPlataformaRetenido)} retenido`);
      setText("mDebt", money(metricas.deudaComisiones));
      setText("mDriverPay", money(metricas.totalMotoristas));
      setText("mWallets", money(metricas.saldoWallets));
      setText("mHeld", money(metricas.saldoRetenido));
    }

    function renderNavCounts() {
      setText("navOverview", state.resumen?.viajesActivos?.length || 0);
      setText("navUsers", state.usuarios.length);
      setText("navTrips", state.viajes.length);
      setText("navPackages", state.resumen?.paquetesRecientes?.length || 0);
      setText("navFinance", state.retiros.filter((r) => r.estado === "pendiente").length);
      setText("navCredits", state.resumen?.creditosMotoristas?.length || 0);
      setText("navOps", state.resumen?.reservasActivas?.length || 0);
      setText("navMonitor", monitorNavBadge());
      setText("navLaunch", state.launch?.enabled ? "ON" : "OFF");
    }

    function renderCharts() {
      const tendencia = state.resumen?.tendencia || [];
      const viajes = state.resumen?.viajes || {};

      drawChart("trendChart", {
        type: "line",
        data: {
          labels: tendencia.map((item) => item._id),
          datasets: [
            { label: "Viajes", data: tendencia.map((item) => item.viajes || 0), borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.10)", tension: 0.35, yAxisID: "y" },
            { label: "Ingresos", data: tendencia.map((item) => item.ingresos || 0), borderColor: "#ff6a00", backgroundColor: "rgba(255,106,0,0.12)", tension: 0.35, yAxisID: "y1" },
            { label: "Comision", data: tendencia.map((item) => item.comision || 0), borderColor: "#16a34a", backgroundColor: "rgba(22,163,74,0.10)", tension: 0.35, yAxisID: "y1" }
          ]
        },
        options: chartOptions(true)
      });

      drawChart("stateChart", {
        type: "doughnut",
        data: {
          labels: Object.keys(viajes).map(formatType),
          datasets: [{ data: Object.values(viajes), backgroundColor: ["#2563eb", "#ff6a00", "#16a34a", "#7c3aed", "#dc2626", "#0ea5e9", "#64748b"] }]
        },
        options: chartOptions(false)
      });
    }

    function renderActiveTrips() {
      const rows = filterRows(state.resumen?.viajesActivos || [], tripSearchText);
      setRows("activeTripsRows", rows, 10, "No hay viajes activos", (trip) => tripRow(trip, { active: true }));
    }

    function renderUsers() {
      const rows = filterRows(state.usuarios || [], userSearchText);
      setRows("userRows", rows, 8, "No hay usuarios para mostrar", userRow);
    }

    function renderTrips() {
      const rows = filterRows(state.viajes || [], tripSearchText);
      setRows("tripRows", rows, 11, "No hay viajes para este filtro", (trip) => tripRow(trip, { full: true }));
    }

    function renderDelayReassignment() {
      const data = state.delayReassignment || {};
      const viajes = Array.isArray(data.viajes) ? data.viajes : [];
      const rows = filterRows(viajes, tripSearchText);
      const total = Number(data.total ?? viajes.length ?? 0);
      const thresholds = data.thresholds || {};

      setText("delayReassignTotal", total);
      setText("delayAssignedThreshold", `${thresholds.asignado || 8} min`);
      setText("delayReservedThreshold", `${thresholds.reservado || 12} min`);
      setText("delayReassignStatus", total ? "Revisar" : "OK");

      const status = document.getElementById("delayReassignStatus");
      if (status) status.className = total ? "status warning" : "status ok";

      setRows("delayReassignRows", rows, 7, "No hay viajes demorados para reasignar", delayReassignRow);
    }

    function renderPackages() {
      const rows = filterRows(state.resumen?.paquetesRecientes || [], tripSearchText);
      setRows("packageRows", rows, 8, "No hay envios para mostrar", packageRow);
    }

    function renderWallets() {
      const rows = filterRows(state.resumen?.wallets || [], walletSearchText);
      setRows("walletRows", rows, 6, "No hay wallets para mostrar", walletRow);
    }

    function renderPlatformWallet() {
      const rows = filterRows(state.resumen?.plataformaWallet?.movimientos || [], platformMovementSearchText);
      setRows("platformWalletRows", rows, 5, "La wallet BeGO aun no tiene movimientos", platformMovementRow);
    }

    function renderWithdraws() {
      const rows = filterRows(state.retiros || [], withdrawSearchText);
      setRows("withdrawRows", rows, 6, "No hay retiros para mostrar", withdrawRow);
    }

    function renderCredits() {
      const rows = filterRows(state.resumen?.creditosMotoristas || [], creditSearchText);
      setRows("creditRows", rows, 7, "No hay motoristas con 1000+ viajes todavia", creditRow);
    }

    function renderOps() {
      renderMiniList("cityList", state.resumen?.operacion?.ciudades || [], (item) => ({
        icon: "fa-location-dot",
        title: item._id || "sin ciudad",
        text: `${item.total || 0} viajes - ${item.activos || 0} activos`,
        chip: item.activos || 0
      }));
      renderMapList("typeList", state.resumen?.operacion?.viajesPorTipo || {}, "fa-layer-group");
      renderMapList("paymentList", state.resumen?.operacion?.pagosPorMetodo || {}, "fa-credit-card");
    }

    function renderReservations() {
      const rows = filterRows(state.resumen?.reservasActivas || [], tripSearchText);
      setRows("reservationRows", rows, 7, "No hay reservas activas", reservationRow);
    }

    function renderMonitoring() {
      const monitoring = state.monitoring || {};
      const health = monitoring.health || {
        level: "warning",
        label: "Sin datos",
        message: "Esperando primera lectura del monitor"
      };
      const lastCheck = monitoring.monitorState?.lastCheck || {};
      const pm2Apps = Object.entries(lastCheck.pm2?.apps || {});
      const pm2Online = pm2Apps.filter(([, app]) => app.status === "online").length;
      const pm2Restarts = pm2Apps.reduce((sum, [, app]) => sum + Number(app.restarts || 0), 0);
      const pm2Delta = pm2Apps.reduce((sum, [, app]) => sum + Number(app.delta || 0), 0);
      const frontendErrors = Number(monitoring.frontendErrors10m || 0);
      const frontendCritical = Number(monitoring.frontendCritical10m || 0);
      const socketDisconnects = Number(monitoring.socketDisconnects || 0);

      setText("mMonitorHealth", health.label);
      setText("mMonitorHealthText", health.message);
      setText("mMonitorPm2", `${pm2Online}/${pm2Apps.length || 0}`);
      setText("mMonitorPm2Text", `${pm2Restarts} reinicios acumulados, ${pm2Delta} nuevos`);
      setText("mMonitorSocket", socketDisconnects);
      setText("mMonitorSocketText", `Limite ${monitoring.thresholds?.socketDisconnects || 80} en ventana operativa`);
      setText("mMonitorFrontend", frontendErrors);
      setText("mMonitorFrontendText", frontendCritical ? `${frontendCritical} criticos en 10 min` : "Errores reales desde WebView/navegador");
      setText("monitorUpdatedLabel", lastCheck.at ? `Lectura ${formatDate(lastCheck.at)}` : "Sin lectura");

      const updated = document.getElementById("monitorUpdatedLabel");
      if (updated) updated.className = `status ${monitorStatusClass(health.level)}`;

      renderMonitorServices(monitoring);
      renderMonitorAlerts(monitoring.criticalAlerts || []);
      renderMonitorErrors();
    }

    function renderMonitorServices(monitoring) {
      const target = document.getElementById("monitorServiceList");
      if (!target) return;

      const lastCheck = monitoring.monitorState?.lastCheck || {};
      const pm2Apps = Object.entries(lastCheck.pm2?.apps || {});
      const rows = [
        {
          icon: "fa-database",
          title: "MongoDB",
          text: lastCheck.mongo?.ok ? `Estado ${lastCheck.mongo.state || 1}` : (lastCheck.mongo?.error || "Sin lectura"),
          status: lastCheck.mongo?.ok ? "ok" : "critical",
          chip: lastCheck.mongo?.ok ? "OK" : "Falla",
        },
        {
          icon: "fa-memory",
          title: "Redis",
          text: lastCheck.redis?.ok ? "PING respondio correctamente" : (lastCheck.redis?.error || "Sin lectura"),
          status: lastCheck.redis?.ok ? "ok" : "critical",
          chip: lastCheck.redis?.ok ? "OK" : "Falla",
        },
        {
          icon: "fa-server",
          title: "PM2",
          text: pm2Apps.length
            ? pm2Apps.map(([name, app]) => `${name}: ${app.status} (${app.delta || 0} nuevos)`).join(" | ")
            : "Sin procesos reportados",
          status: lastCheck.pm2?.ok ? "ok" : "critical",
          chip: lastCheck.pm2?.ok ? "OK" : "Falla",
        },
        {
          icon: "fa-plug-circle-bolt",
          title: "Socket.IO",
          text: `${monitoring.socketDisconnects || 0} desconexiones recientes`,
          status: Number(monitoring.socketDisconnects || 0) >= Number(monitoring.thresholds?.socketDisconnects || 80) ? "warning" : "ok",
          chip: monitoring.socketDisconnects || 0,
        },
        {
          icon: "fa-mobile-screen-button",
          title: "Frontend movil",
          text: `${monitoring.frontendErrors10m || 0} errores, ${monitoring.frontendCritical10m || 0} criticos en 10 min`,
          status: Number(monitoring.frontendCritical10m || 0) ? "critical" : Number(monitoring.frontendErrors10m || 0) ? "warning" : "ok",
          chip: monitoring.frontendErrors10m || 0,
        },
      ];

      target.innerHTML = rows.map((item) => `
        <article class="mini-card">
          <i class="mini-icon fa-solid ${item.icon}"></i>
          <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></div>
          <span class="status ${item.status}">${escapeHtml(item.chip)}</span>
        </article>
      `).join("");
    }

    function renderMonitorAlerts(alerts) {
      const target = document.getElementById("monitorAlertList");
      if (!target) return;

      if (!alerts.length) {
        target.innerHTML = `<div class="empty">No hay alertas recientes</div>`;
        return;
      }

      target.innerHTML = alerts.slice(0, 8).map((alert) => {
        const severity = monitorStatusClass(alert.severity);
        return `
          <article class="monitor-alert">
            <div class="monitor-alert-head">
              <strong>${escapeHtml(formatType(alert.type || "alerta"))}</strong>
              <span class="status ${severity}">${escapeHtml(alert.severity || "info")}</span>
            </div>
            <p>${escapeHtml(alert.message || "Sin mensaje")}</p>
            <span class="row-sub">${escapeHtml(formatDate(alert.ts))}</span>
          </article>
        `;
      }).join("");
    }

    function renderMonitorErrors() {
      const rows = filterRows(state.monitoring?.recentFrontendErrors || [], monitorSearchText);
      setRows("monitorErrorRows", rows, 7, "No hay errores frontend recientes", monitorErrorRow);
    }
