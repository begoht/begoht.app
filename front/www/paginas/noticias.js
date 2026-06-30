import { fetchNews, hasUnreadNews, markNewsRead } from "../js/notifications/notifications.js";

export function renderNoticias() {
  return `
    <section class="news-page">
      <div class="news-hero">
        <span><i class="fa-solid fa-bullhorn"></i> BeGO</span>
        <h1>Noticias</h1>
        <p>Avisos importantes, novedades y mensajes del equipo BeGO.</p>
      </div>
      <div class="news-list" id="passengerNewsList">
        <div class="news-empty"><i class="fa-solid fa-circle-notch fa-spin"></i>Cargando noticias...</div>
      </div>
    </section>
  `;
}

export async function initNoticias() {
  const list = document.getElementById("passengerNewsList");
  if (!list) return;

  try {
    const news = await fetchNews();
    const unread = hasUnreadNews(news);
    list.innerHTML = news.length
      ? news.map((item, index) => newsCard(item, unread && index === 0)).join("")
      : `<div class="news-empty"><i class="fa-solid fa-inbox"></i>No hay noticias por ahora.</div>`;
    markNewsRead(news);
  } catch (error) {
    list.innerHTML = `<div class="news-empty"><i class="fa-solid fa-triangle-exclamation"></i>${escapeHtml(error.message)}</div>`;
  }
}

function newsCard(item = {}, isNew = false) {
  return `
    <article class="news-card ${isNew ? "is-new" : ""}">
      <div class="news-card-icon"><i class="fa-solid fa-bell"></i></div>
      <div>
        <div class="news-card-head">
          <h2>${escapeHtml(item.title || "BeGO")}</h2>
          ${isNew ? "<span>Nuevo</span>" : ""}
        </div>
        <p>${escapeHtml(item.message || "")}</p>
        <time>${formatDate(item.createdAt)}</time>
      </div>
    </article>
  `;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char]);
}
