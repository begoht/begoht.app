// Admin dashboard finance, fares, wallet discount and payment methods.
    function renderCommission() {
      const percent = currentCommissionPercent();
      const active = document.activeElement;
      const percentInput = document.getElementById("commissionPercentInput");
      const debtLimitInput = document.getElementById("commissionDebtLimitInput");
      const debtLimit = currentCommissionDebtLimit();

      setText("commissionPercentDisplay", formatPercent(percent));
      setText("commissionDebtLimitDisplay", money(debtLimit));
      setText("commissionUpdatedLabel", `${formatPercent(percent)} activo - limite ${money(debtLimit)}`);
      setText("mCommissionRateLabel", `${formatPercent(percent)} activo`);

      if (percentInput && active?.id !== "commissionPercentInput") {
        percentInput.value = trimNumber(percent);
      }

      if (debtLimitInput && active?.id !== "commissionDebtLimitInput") {
        debtLimitInput.value = Math.round(Number(debtLimit || 0));
      }

      renderCommissionPreview();
    }

    function renderCommissionPreview() {
      const percentInput = document.getElementById("commissionPercentInput");
      const totalInput = document.getElementById("commissionPreviewTotalInput");
      const percent = Number(percentInput?.value || currentCommissionPercent());
      const total = Math.max(0, Number(totalInput?.value || 0));
      const safePercent = Number.isFinite(percent) ? Math.min(50, Math.max(0, percent)) : currentCommissionPercent();
      const fee = Math.round(total * (safePercent / 100));
      const debtLimit = Number(document.getElementById("commissionDebtLimitInput")?.value ?? currentCommissionDebtLimit());

      setText("commissionPreviewFee", money(fee));
      setText("commissionPreviewDriver", money(Math.max(0, total - fee)));
      setText("commissionPercentDisplay", formatPercent(safePercent));
      setText("commissionDebtLimitDisplay", money(Number.isFinite(debtLimit) ? debtLimit : currentCommissionDebtLimit()));
    }

    async function saveCommission() {
      const input = document.getElementById("commissionPercentInput");
      const percentage = Number(input?.value);
      const debtLimit = Number(document.getElementById("commissionDebtLimitInput")?.value);

      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 50) {
        showToast("La comision debe estar entre 0% y 50%");
        return;
      }

      if (!Number.isFinite(debtLimit) || debtLimit < 0 || debtLimit > 1000000) {
        showToast("El limite de comision pendiente debe estar entre 0 y 1,000,000 HTG");
        return;
      }

      try {
        state.commission = await api("/api/admin/commission", {
          method: "PUT",
          body: { percentage, debtLimit }
        });

        if (!state.resumen) state.resumen = {};
        if (!state.resumen.config) state.resumen.config = {};
        state.resumen.config.commission = state.commission;
        renderCommission();
        showToast(`Comision actualizada a ${formatPercent(state.commission.percentage)}, limite ${money(state.commission.debtLimit)}`);
      } catch (err) {
        console.error(err);
        showToast("No se pudo guardar la comision");
      }
    }

    function currentCommissionPercent() {
      return Number(state.commission?.percentage ?? state.resumen?.config?.commission?.percentage ?? 15);
    }

    function currentCommissionDebtLimit() {
      return Number(
        state.commission?.debtLimit ??
        state.commission?.commissionDebtLimit ??
        state.resumen?.config?.commission?.debtLimit ??
        state.resumen?.config?.commission?.commissionDebtLimit ??
        1000
      );
    }

    function currentFareConfig() {
      return state.fares || state.resumen?.config?.fares || { baseFare: 200, pricePerKm: 60 };
    }

    function renderBaseFare() {
      const fares = currentFareConfig();
      const active = document.activeElement;
      const baseInput = document.getElementById("baseFareInput");
      const pricePerKmInput = document.getElementById("pricePerKmInput");
      const status = document.getElementById("baseFareStatus");

      if (baseInput && active?.id !== "baseFareInput") {
        baseInput.value = Math.round(Number(fares.baseFare || 0));
      }

      if (pricePerKmInput && active?.id !== "pricePerKmInput") {
        pricePerKmInput.value = Math.round(Number(fares.pricePerKm || 0));
      }

      setText("baseFareDisplay", money(fares.baseFare));
      setText("baseFarePerKmDisplay", money(fares.pricePerKm));

      if (status) {
        status.textContent = `${money(fares.baseFare)} + ${money(fares.pricePerKm)}/km`;
        status.className = "status activo";
      }

      renderBaseFarePreview();
    }

    function renderBaseFarePreview() {
      const fares = currentFareConfig();
      const baseRaw = Number(document.getElementById("baseFareInput")?.value ?? fares.baseFare);
      const kmPriceRaw = Number(document.getElementById("pricePerKmInput")?.value ?? fares.pricePerKm);
      const kmRaw = Number(document.getElementById("baseFarePreviewKmInput")?.value || 0);
      const baseFare = Number.isFinite(baseRaw) ? Math.min(100000, Math.max(0, Math.round(baseRaw))) : Number(fares.baseFare || 0);
      const pricePerKm = Number.isFinite(kmPriceRaw) ? Math.min(100000, Math.max(0, Math.round(kmPriceRaw))) : Number(fares.pricePerKm || 0);
      const km = Number.isFinite(kmRaw) ? Math.max(0, kmRaw) : 0;
      const total = baseFare + Math.round(km * pricePerKm);

      setText("baseFareDisplay", money(baseFare));
      setText("baseFarePerKmDisplay", money(pricePerKm));
      setText("baseFarePreviewTotal", money(total));
    }

    async function saveBaseFare() {
      const baseFare = Number(document.getElementById("baseFareInput")?.value);
      const pricePerKm = Number(document.getElementById("pricePerKmInput")?.value);

      if (!Number.isFinite(baseFare) || baseFare < 0 || baseFare > 100000) {
        showToast("La tarifa base debe estar entre 0 y 100,000 HTG");
        return;
      }

      if (!Number.isFinite(pricePerKm) || pricePerKm < 0 || pricePerKm > 100000) {
        showToast("El precio por kilometro debe estar entre 0 y 100,000 HTG");
        return;
      }

      try {
        state.fares = await api("/api/admin/fares", {
          method: "PUT",
          body: { baseFare, pricePerKm }
        });

        if (!state.resumen) state.resumen = {};
        if (!state.resumen.config) state.resumen.config = {};
        state.resumen.config.fares = state.fares;
        renderBaseFare();
        showToast(`Tarifas actualizadas: ${money(state.fares.baseFare)} + ${money(state.fares.pricePerKm)}/km`);
      } catch (err) {
        console.error(err);
        showToast("No se pudieron guardar las tarifas");
      }
    }

    function renderWalletDiscount() {
      const discount = state.walletDiscount || state.resumen?.config?.walletDiscount || {};
      const active = document.activeElement;
      const enabledInput = document.getElementById("walletDiscountEnabledInput");
      const percentInput = document.getElementById("walletDiscountPercentInput");
      const labelInput = document.getElementById("walletDiscountLabelInput");
      const status = document.getElementById("walletDiscountStatus");

      if (enabledInput && active?.id !== "walletDiscountEnabledInput") {
        enabledInput.checked = !!discount.enabled;
      }

      if (percentInput && active?.id !== "walletDiscountPercentInput") {
        percentInput.value = trimNumber(discount.percentage || 0);
      }

      if (labelInput && active?.id !== "walletDiscountLabelInput") {
        labelInput.value = discount.label || "Remise Wallet";
      }

      if (status) {
        status.textContent = discount.enabled ? `${formatPercent(discount.percentage)} activo` : "Apagado";
        status.className = discount.enabled ? "status activo" : "status apagado";
      }

      renderWalletDiscountPreview();
    }

    function renderWalletDiscountPreview() {
      const enabled = !!document.getElementById("walletDiscountEnabledInput")?.checked;
      const percentRaw = Number(document.getElementById("walletDiscountPercentInput")?.value || 0);
      const percent = Number.isFinite(percentRaw) ? Math.min(50, Math.max(0, percentRaw)) : 0;
      const total = Math.max(0, Number(document.getElementById("walletDiscountPreviewTotalInput")?.value || 0));
      const effectivePercent = enabled ? percent : 0;
      const savings = Math.round(total * (effectivePercent / 100));
      const final = Math.max(0, total - savings);
      const label = document.getElementById("walletDiscountLabelInput")?.value || "Remise Wallet";

      setText("walletDiscountPercentDisplay", formatPercent(effectivePercent));
      setText("walletDiscountLabelPreview", enabled
        ? `${label} se vera como badge en el boton Wallet BeGO.`
        : "Activalo para que el boton Wallet muestre el descuento.");
      setText("walletDiscountPreviewSavings", money(savings));
      setText("walletDiscountPreviewFinal", money(final));
    }

    async function saveWalletDiscount() {
      const enabled = !!document.getElementById("walletDiscountEnabledInput")?.checked;
      const percentage = Number(document.getElementById("walletDiscountPercentInput")?.value || 0);
      const label = document.getElementById("walletDiscountLabelInput")?.value || "Remise Wallet";

      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 50) {
        showToast("El descuento wallet debe estar entre 0% y 50%");
        return;
      }

      try {
        state.walletDiscount = await api("/api/admin/wallet-discount", {
          method: "PUT",
          body: { enabled, percentage, label }
        });

        if (!state.resumen) state.resumen = {};
        if (!state.resumen.config) state.resumen.config = {};
        state.resumen.config.walletDiscount = state.walletDiscount;
        renderWalletDiscount();
        showToast(state.walletDiscount.enabled
          ? `Descuento wallet actualizado a ${formatPercent(state.walletDiscount.percentage)}`
          : "Descuento wallet desactivado");
      } catch (err) {
        console.error(err);
        showToast("No se pudo guardar el descuento wallet");
      }
    }

    function paymentMethodOrder() {
      return ["efectivo", "wallet", "moncash", "natcash"];
    }

    function paymentMethodDefaults() {
      return {
        efectivo: { id: "efectivo", label: "Efectivo", enabled: true, canPay: true, configured: true, status: "ready", unavailableMessage: "Efectivo no disponible por ahora." },
        wallet: { id: "wallet", label: "Wallet BeGO", enabled: true, canPay: true, configured: true, status: "ready", unavailableMessage: "Wallet BeGO no disponible por ahora." },
        moncash: { id: "moncash", label: "MonCash", enabled: false, canPay: false, configured: false, status: "disabled", unavailableMessage: "MonCash no disponible por ahora." },
        natcash: { id: "natcash", label: "NatCash", enabled: false, canPay: false, configured: false, status: "disabled", unavailableMessage: "NatCash no disponible por ahora." }
      };
    }

    function currentPaymentMethods() {
      return {
        ...paymentMethodDefaults(),
        ...(state.paymentMethods?.methods || {})
      };
    }

    function renderPaymentMethods() {
      const target = document.getElementById("paymentMethodSwitches");
      if (!target) return;

      const methods = currentPaymentMethods();
      const rows = paymentMethodOrder().map((id) => paymentMethodSwitch(methods[id]));
      const activeCount = paymentMethodOrder().filter((id) => methods[id]?.enabled).length;

      setText("paymentMethodsStatus", `${activeCount} activos`);
      const status = document.getElementById("paymentMethodsStatus");
      if (status) status.className = activeCount ? "status activo" : "status apagado";

      target.innerHTML = rows.join("");
    }

    function paymentMethodSwitch(method) {
      const id = method.id;
      const configuredText = method.configured ? "Proveedor configurado" : "Falta configurar proveedor";
      const statusText = !method.enabled ? "Pausado" : method.canPay ? "Listo" : configuredText;
      const statusClass = !method.enabled ? "apagado" : method.canPay ? "activo" : "warning";
      const disabledNote = ["moncash", "natcash"].includes(id)
        ? `<small>${escapeHtml(statusText)}. Si falla, apagalo y la app mostrara no disponible.</small>`
        : `<small>${escapeHtml(statusText)} para nuevas cotizaciones.</small>`;

      return `
        <label class="admin-toggle-row payment-method-toggle" for="paymentMethod_${escapeHtml(id)}">
          <span>
            <span class="row-main">${escapeHtml(method.label || id)}</span>
            ${disabledNote}
            <span class="row-sub"><span class="status ${statusClass}">${escapeHtml(statusText)}</span></span>
          </span>
          <input id="paymentMethod_${escapeHtml(id)}" data-payment-method-toggle="${escapeHtml(id)}" type="checkbox" ${method.enabled ? "checked" : ""}>
        </label>
      `;
    }

    async function savePaymentMethods() {
      const existing = currentPaymentMethods();
      const methods = {};

      paymentMethodOrder().forEach((id) => {
        methods[id] = {
          enabled: !!document.querySelector(`[data-payment-method-toggle="${id}"]`)?.checked,
          label: existing[id]?.label,
          unavailableMessage: existing[id]?.unavailableMessage || `${existing[id]?.label || id} no disponible por ahora.`
        };
      });

      try {
        state.paymentMethods = await api("/api/admin/payment-methods", {
          method: "PUT",
          body: { methods }
        });
        renderPaymentMethods();
        showToast("Metodos de pago actualizados");
      } catch (err) {
        console.error(err);
        showToast("No se pudieron guardar los metodos de pago");
      }
    }
