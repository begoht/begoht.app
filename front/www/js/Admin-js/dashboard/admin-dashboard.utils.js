// Admin dashboard formatting, DOM and chart helpers.
    function setRows(id, rows, cols, emptyText, mapper) {
      const target = document.getElementById(id);
      if (!target) return;
      target.innerHTML = rows.length ? rows.map(mapper).join("") : emptyRow(cols, emptyText);
    }

    function renderMiniList(id, rows, mapper) {
      const target = document.getElementById(id);
      if (!target) return;
      if (!rows.length) {
        target.innerHTML = `<div class="empty">Sin datos</div>`;
        return;
      }
      target.innerHTML = rows.map((rowData) => {
        const item = mapper(rowData);
        return `
          <article class="mini-card">
            <i class="mini-icon fa-solid ${item.icon}"></i>
            <div><strong>${escapeHtml(formatType(item.title))}</strong><span>${escapeHtml(item.text)}</span></div>
            <span class="status">${escapeHtml(item.chip)}</span>
          </article>
        `;
      }).join("");
    }

    function renderMapList(id, map, icon) {
      const rows = Object.entries(map).map(([title, total]) => ({ title, total }));
      renderMiniList(id, rows, (item) => ({
        icon,
        title: item.title,
        text: `${item.total} registros`,
        chip: item.total
      }));
    }

    function row(cells) {
      return `<tr>${cells.join("")}</tr>`;
    }

    function cell(label, html) {
      return `<td data-label="${escapeHtml(label)}">${html}</td>`;
    }

    function emptyRow(cols, text) {
      return `<tr><td colspan="${cols}" data-label=""><div class="empty">${escapeHtml(text)}</div></td></tr>`;
    }

    function filterRows(rows, picker) {
      if (!state.search) return rows;
      return rows.filter((row) => String(picker(row)).toLowerCase().includes(state.search));
    }

    function userSearchText(user) {
      return `${fullName(user)} ${user.email || ""} ${user.telefono || ""} ${user.rol || ""} ${user.alias || ""}`;
    }

    function tripSearchText(trip) {
      return `${trip._id || ""} ${trip.tipo || ""} ${trip.estado || ""} ${trip.estadoPago || ""} ${trip.metodoPago || ""} ${trip.ciudad || ""} ${trip.pasajero?.nombre || ""} ${trip.pasajero?.telefono || ""} ${trip.motorista?.nombre || ""} ${trip.motorista?.telefono || ""}`;
    }

    function walletSearchText(wallet) {
      const user = wallet.userId || {};
      return `${user.nombre || ""} ${user.telefono || ""} ${user.rol || ""} ${wallet.saldo || ""} ${wallet.gananciaEfectivo || ""} ${wallet.comisionPendiente || ""}`;
    }

    function platformMovementSearchText(movimiento) {
      return `${movimiento.tipo || ""} ${movimiento.descripcion || ""} ${movimiento.ref || ""} ${movimiento.monto || ""}`;
    }

    function withdrawSearchText(retiro) {
      const user = retiro.userId || {};
      return `${user.nombre || ""} ${user.telefono || ""} ${retiro.telefono || ""} ${retiro.metodo || ""} ${retiro.estado || ""}`;
    }

    function creditSearchText(item) {
      const driver = item.motorista || {};
      return `${driver.nombre || ""} ${driver.telefono || ""} ${item.viajesFinalizados || ""}`;
    }

    function monitorSearchText(item) {
      return `${item.source || ""} ${item.level || ""} ${item.type || ""} ${item.message || ""} ${item.route || ""} ${item.release || ""} ${item.userAgent || ""}`;
    }

    function monitorErrorRow(item) {
      return row([
        cell("App", `<span class="row-main">${escapeHtml(formatType(item.source))}</span><span class="row-sub">${escapeHtml(item.release || "-")}</span>`),
        cell("Nivel", `<span class="status ${monitorStatusClass(item.level)}">${escapeHtml(formatType(item.level))}</span>`),
        cell("Tipo", `<span class="status">${escapeHtml(formatType(item.type))}</span>`),
        cell("Mensaje", `<span class="row-main">${escapeHtml(item.message || "-")}</span><span class="row-sub">${escapeHtml(shortId(item._id))}</span>`),
        cell("Ruta", `<span class="row-main">${escapeHtml(item.route || "-")}</span><span class="row-sub">${escapeHtml(item.url || "")}</span>`),
        cell("Dispositivo", `<span class="row-main">${escapeHtml(deviceLabel(item.userAgent))}</span><span class="row-sub">${escapeHtml(viewportLabel(item.viewport))}</span>`),
        cell("Fecha", formatDate(item.createdAt))
      ]);
    }

    function monitorNavBadge() {
      const health = state.monitoring?.health?.level;
      if (health === "critical") return "!";
      if (health === "warning") return "REV";
      if (health === "ok") return "OK";
      return "...";
    }

    function monitorStatusClass(value) {
      const token = String(value || "").toLowerCase();
      if (["ok", "online", "activo", "stable", "info"].includes(token)) return "ok";
      if (["warning", "warn", "atencion", "pending"].includes(token)) return "warning";
      if (["critical", "error", "danger", "failed", "down"].includes(token)) return "critical";
      return cssToken(token || "warning");
    }

    function deviceLabel(userAgent = "") {
      const ua = String(userAgent || "");
      if (!ua) return "-";
      const android = ua.match(/Android\s+([\d.]+)/i)?.[1];
      const chrome = ua.match(/Chrome\/([\d.]+)/i)?.[1];
      const webview = /wv\)/i.test(ua) || /; wv/i.test(ua);
      if (android) return `Android ${android}${webview ? " WebView" : chrome ? " Chrome" : ""}`;
      if (/iPhone|iPad/i.test(ua)) return "iOS Safari";
      return ua.split(" ").slice(0, 3).join(" ");
    }

    function viewportLabel(viewport = {}) {
      const width = Number(viewport.width || 0);
      const height = Number(viewport.height || 0);
      const dpr = Number(viewport.dpr || 1);
      if (!width || !height) return "-";
      return `${width}x${height} DPR ${trimNumber(dpr)}`;
    }

    function personCell(user, fallback) {
      if (!user) return `<span class="row-main">-</span>`;
      return `<span class="row-main">${escapeHtml(fullName(user) || "Usuario")}</span><span class="row-sub">${escapeHtml(user.telefono || shortId(fallback || user._id))}</span>`;
    }

    function fullName(user) {
      return [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim();
    }

    function routeText(trip) {
      const origen = trip.origen?.direccion || "Origen";
      const destino = trip.destino?.direccion || "Destino";
      return `${shortPlace(origen)} -> ${shortPlace(destino)}`;
    }

    function shortPlace(value) {
      return String(value || "").split(",")[0].trim() || "-";
    }

    function drawChart(id, config) {
      const ctx = document.getElementById(id);
      if (!ctx || !window.Chart) return;
      state.charts[id]?.destroy();
      state.charts[id] = new Chart(ctx, config);
    }

    function chartOptions(dualAxis) {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { usePointStyle: true, boxWidth: 8, color: "#cbd5e1", font: { weight: 700 } } }
        },
        scales: dualAxis ? {
          y: { beginAtZero: true, grid: { color: "rgba(148, 163, 184, 0.16)" }, ticks: { color: "#94a3b8" } },
          y1: { beginAtZero: true, position: "right", grid: { display: false }, ticks: { color: "#94a3b8" } }
        } : undefined
      };
    }

    function money(value) {
      const n = Number(value || 0);
      return `${n.toLocaleString("fr-HT", { maximumFractionDigits: 2 })} HTG`;
    }

    function formatPercent(value) {
      const n = Number(value || 0);
      return `${trimNumber(n)}%`;
    }

    function trimNumber(value) {
      const n = Number(value || 0);
      return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
    }

    function roundCredit(value) {
      const amount = Math.round(Number(value || 0) / 5000) * 5000;
      return Math.max(0, Math.min(750000, amount));
    }

    function formatDate(value) {
      if (!value) return "-";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
    }

    function toDateTimeLocal(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    }

    function padTime(value) {
      return String(Math.max(0, Number(value) || 0)).padStart(2, "0");
    }

    function formatType(value) {
      return String(value || "-").replace(/_/g, " ");
    }

    function cssToken(value) {
      return String(value || "").replace(/[^a-z0-9_-]/gi, "_");
    }

    function shortId(value) {
      return value ? String(value).slice(-8) : "-";
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
      }[char]));
    }

    function setText(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    }

    function setBusy(isBusy) {
      const btn = document.getElementById("refreshBtn");
      if (!btn) return;
      btn.disabled = isBusy;
      btn.innerHTML = isBusy ? `<i class="fa-solid fa-spinner fa-spin"></i>Cargando` : `<i class="fa-solid fa-rotate"></i>Actualizar`;
    }

    function showToast(text) {
      const toast = document.getElementById("toast");
      toast.textContent = text;
      toast.classList.add("show");
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
    }
