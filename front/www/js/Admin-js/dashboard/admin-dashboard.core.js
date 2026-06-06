// Admin dashboard boot, navigation and data loading.
document.addEventListener("DOMContentLoaded", () => {
      protectAdmin();
      bindUi();
      loadAll();
      setInterval(() => renderLaunchTime(state.launch?.launchAt), 1000);
      setInterval(() => loadMonitoring({ silent: true }), 45000);
    });

    function protectAdmin() {
      const user = readUser();
      const token = getToken();
      if (!user || !token) return location.replace("../login.html");
      if (user.rol !== "admin") {
        alert("Acceso solo para administradores");
        return location.replace("../index.html");
      }
      setText("adminName", user.nombre || user.alias || "Admin");
    }

    function bindUi() {
      document.querySelectorAll("[data-section-target]").forEach((btn) => {
        btn.addEventListener("click", () => setSection(btn.dataset.sectionTarget));
      });
      document.querySelectorAll("[data-section-jump]").forEach((btn) => {
        btn.addEventListener("click", () => setSection(btn.dataset.sectionJump));
      });
      document.getElementById("refreshBtn").addEventListener("click", loadAll);
      document.getElementById("refreshMonitorBtn")?.addEventListener("click", () => loadMonitoring());
      document.getElementById("refreshDelayedTripsBtn")?.addEventListener("click", () => loadDelayReassignment());
      document.getElementById("executeDelayedReassignBtn")?.addEventListener("click", executeDelayReassignment);
      document.getElementById("logoutBtn").addEventListener("click", logout);
      document.getElementById("saveLaunchBtn")?.addEventListener("click", () => saveLaunch());
      document.getElementById("toggleLaunchBtn")?.addEventListener("click", toggleLaunch);
      document.getElementById("saveCommissionBtn")?.addEventListener("click", saveCommission);
      document.getElementById("commissionPercentInput")?.addEventListener("input", renderCommissionPreview);
      document.getElementById("commissionPreviewTotalInput")?.addEventListener("input", renderCommissionPreview);
      document.getElementById("saveBaseFareBtn")?.addEventListener("click", saveBaseFare);
      document.getElementById("baseFareInput")?.addEventListener("input", renderBaseFarePreview);
      document.getElementById("pricePerKmInput")?.addEventListener("input", renderBaseFarePreview);
      document.getElementById("baseFarePreviewKmInput")?.addEventListener("input", renderBaseFarePreview);
      document.getElementById("saveWalletDiscountBtn")?.addEventListener("click", saveWalletDiscount);
      document.getElementById("savePaymentMethodsBtn")?.addEventListener("click", savePaymentMethods);
      document.getElementById("walletDiscountEnabledInput")?.addEventListener("change", renderWalletDiscountPreview);
      document.getElementById("walletDiscountPercentInput")?.addEventListener("input", renderWalletDiscountPreview);
      document.getElementById("walletDiscountLabelInput")?.addEventListener("input", renderWalletDiscountPreview);
      document.getElementById("walletDiscountPreviewTotalInput")?.addEventListener("input", renderWalletDiscountPreview);
      document.getElementById("tripStatusFilter").addEventListener("change", (event) => {
        state.filtroViajes = event.target.value;
        loadTrips();
      });
      document.getElementById("globalSearch").addEventListener("input", (event) => {
        state.search = event.target.value.trim().toLowerCase();
        renderAll();
      });
    }

    function setSection(name) {
      document.querySelectorAll("[data-section-target]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.sectionTarget === name);
      });
      document.querySelectorAll(".section").forEach((section) => {
        section.classList.toggle("active", section.id === `section-${name}`);
      });
    }

    async function loadAll() {
      setBusy(true);
      try {
        const [resumen, usuarios, retiros, launch, commission, walletDiscount, paymentMethods, fares, monitoring, delayReassignment] = await Promise.all([
          api("/api/dashboard/resumen"),
          api("/api/admin/usuarios"),
          api("/api/admin/retiros").catch(() => []),
          api("/api/admin/launch").catch(() => null),
          api("/api/admin/commission").catch(() => null),
          api("/api/admin/wallet-discount").catch(() => null),
          api("/api/admin/payment-methods").catch(() => null),
          api("/api/admin/fares").catch(() => null),
          api("/api/monitor/status").catch(() => null),
          api("/api/admin/viajes/reasignacion-demora").catch(() => null)
        ]);
        state.resumen = resumen || {};
        state.usuarios = Array.isArray(usuarios) ? usuarios : [];
        state.retiros = Array.isArray(retiros) ? retiros : [];
        state.launch = launch || null;
        state.commission = commission || state.resumen?.config?.commission || null;
        state.walletDiscount = walletDiscount || state.resumen?.config?.walletDiscount || null;
        state.paymentMethods = paymentMethods || null;
        state.fares = fares || state.resumen?.config?.fares || null;
        state.monitoring = monitoring || null;
        state.delayReassignment = delayReassignment || null;
        state.viajes = state.resumen.ultimosViajes || [];
        renderAll();
        setText("lastSync", `Actualizado ${new Date().toLocaleTimeString()}`);
        showToast("Panel actualizado");
      } catch (err) {
        console.error(err);
        showToast("No se pudo cargar el panel");
      } finally {
        setBusy(false);
      }
    }

    async function loadTrips() {
      try {
        state.viajes = await api(`/api/dashboard/viajes?estado=${encodeURIComponent(state.filtroViajes)}`);
        renderTrips();
      } catch (err) {
        console.error(err);
        showToast("No se pudieron cargar los viajes");
      }
    }

    async function loadMonitoring({ silent = false } = {}) {
      try {
        state.monitoring = await api("/api/monitor/status");
        renderMonitoring();
        renderNavCounts();
        if (!silent) showToast("Monitoreo actualizado");
      } catch (err) {
        console.error(err);
        if (!silent) showToast("No se pudo cargar monitoreo");
      }
    }

    async function loadDelayReassignment({ silent = false } = {}) {
      try {
        state.delayReassignment = await api("/api/admin/viajes/reasignacion-demora");
        renderDelayReassignment();
        if (!silent) showToast("Demoras actualizadas");
      } catch (err) {
        console.error(err);
        if (!silent) showToast("No se pudieron cargar demoras");
      }
    }
