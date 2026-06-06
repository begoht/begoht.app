// Admin dashboard launch gate controls.
    function renderLaunch() {
      const launch = state.launch || {};
      const enabled = !!launch.enabled;
      const launchAt = launch.launchAt || "";
      const title = launch.title || "Lancement officiel BeGO";
      const message = launch.message || "Votre compte est pret. Le service ouvrira officiellement tres bientot.";

      setText("launchPreviewTitle", title);
      setText("launchPreviewMessage", message);
      setText("launchStatus", enabled ? "Activo" : "Apagado");
      setText("launchDateLabel", launchAt ? formatDate(launchAt) : "Sin fecha");
      setText("navLaunch", enabled ? "ON" : "OFF");

      const statusEl = document.getElementById("launchStatus");
      if (statusEl) {
        statusEl.className = enabled ? "status activo" : "status apagado";
      }

      const toggleBtn = document.getElementById("toggleLaunchBtn");
      if (toggleBtn) {
        toggleBtn.className = enabled ? "btn danger" : "btn primary";
        toggleBtn.innerHTML = enabled
          ? `<i class="fa-solid fa-power-off"></i>Desactivar contador`
          : `<i class="fa-solid fa-power-off"></i>Activar contador`;
      }

      syncLaunchFields(launchAt, title, message);
      renderLaunchTime(launchAt);
    }

    function syncLaunchFields(launchAt, title, message) {
      const active = document.activeElement;
      const fields = ["launchAtInput", "launchTitleInput", "launchMessageInput"];
      if (fields.includes(active?.id)) return;

      const dateInput = document.getElementById("launchAtInput");
      const titleInput = document.getElementById("launchTitleInput");
      const messageInput = document.getElementById("launchMessageInput");

      if (dateInput) dateInput.value = launchAt ? toDateTimeLocal(launchAt) : "";
      if (titleInput) titleInput.value = title;
      if (messageInput) messageInput.value = message;
    }

    function renderLaunchTime(launchAt) {
      const diff = launchAt ? Math.max(0, new Date(launchAt).getTime() - Date.now()) : 0;
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setText("launchDays", padTime(days));
      setText("launchHours", padTime(hours));
      setText("launchMinutes", padTime(minutes));
      setText("launchSeconds", padTime(seconds));
    }

    async function saveLaunch(forceEnabled = null) {
      const currentEnabled = !!state.launch?.enabled;
      const enabled = typeof forceEnabled === "boolean" ? forceEnabled : currentEnabled;
      const dateValue = document.getElementById("launchAtInput")?.value || "";
      const launchAt = dateValue ? new Date(dateValue).toISOString() : null;
      const title = document.getElementById("launchTitleInput")?.value || "";
      const message = document.getElementById("launchMessageInput")?.value || "";

      if (enabled && !launchAt) {
        showToast("Primero define fecha y hora del lanzamiento");
        return;
      }

      try {
        state.launch = await api("/api/admin/launch", {
          method: "PUT",
          body: { enabled, launchAt, title, message }
        });
        renderLaunch();
        showToast(enabled ? "Contador de lanzamiento activo" : "Contador guardado apagado");
      } catch (err) {
        console.error(err);
        showToast("No se pudo guardar el lanzamiento");
      }
    }

    function toggleLaunch() {
      saveLaunch(!state.launch?.enabled);
    }
