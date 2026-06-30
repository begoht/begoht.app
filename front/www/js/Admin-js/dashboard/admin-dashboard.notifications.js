function renderNotifications() {
  const target = document.getElementById("adminNotificationHistory");
  if (!target) return;
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];

  target.innerHTML = notifications.length
    ? notifications.map((item) => {
        const delivery = item.delivery || {};
        const audience = item.audience === "todos"
          ? "Todos"
          : item.audience === "motoristas" ? "Motoristas" : "Pasajeros";
        const pushStatus = delivery.pushAvailable
          ? `${delivery.sent || 0} push enviados`
          : "Guardado en noticias";
        return `
          <article class="admin-news-history-card">
            <div class="admin-news-history-icon"><i class="fa-solid fa-bell"></i></div>
            <div>
              <div class="admin-news-history-head">
                <strong>${escapeHtml(item.title || "BeGO")}</strong>
                <span class="status">${escapeHtml(audience)}</span>
              </div>
              <p>${escapeHtml(item.message || "")}</p>
              <small>${escapeHtml(formatDate(item.createdAt))} · ${escapeHtml(pushStatus)}</small>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty">Todavia no se enviaron noticias generales.</div>`;

  setText("navNews", notifications.length);
}

async function sendGeneralNotification(event) {
  event?.preventDefault?.();
  const titleInput = document.getElementById("notificationTitleInput");
  const messageInput = document.getElementById("notificationMessageInput");
  const audienceInput = document.getElementById("notificationAudienceInput");
  const button = document.getElementById("sendNotificationBtn");
  const title = titleInput?.value?.trim() || "";
  const message = messageInput?.value?.trim() || "";
  const audience = audienceInput?.value || "";

  if (!title || !message) {
    showToast("Escribe el titulo y el mensaje");
    return;
  }
  if (!confirm(`Enviar esta noticia a ${audience === "todos" ? "pasajeros y motoristas" : audience}?`)) return;

  if (button) button.disabled = true;
  try {
    const result = await api("/api/admin/notifications", {
      method: "POST",
      body: { title, message, audience },
    });
    state.notifications = [result, ...(state.notifications || [])].slice(0, 50);
    renderNotifications();
    if (titleInput) titleInput.value = "";
    if (messageInput) messageInput.value = "";
    const sent = Number(result.delivery?.sent || 0);
    showToast(sent ? `Noticia enviada y ${sent} celulares avisados` : "Noticia publicada en las apps");
  } catch (error) {
    console.error(error);
    showToast(error.message || "No se pudo enviar la noticia");
  } finally {
    if (button) button.disabled = false;
  }
}

Object.assign(window, { sendGeneralNotification });
