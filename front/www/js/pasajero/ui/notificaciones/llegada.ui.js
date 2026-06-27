const ARRIVAL_NOTICE_MS = 8000;

export function mostrarNotificacionLlegada(data = {}) {
  document.getElementById("toastLlegada")?.remove();

  const toast = document.createElement("aside");
  toast.id = "toastLlegada";
  toast.className = "arrival-notice";
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");
  toast.innerHTML = `
    <div class="arrival-notice__card">
      <div class="arrival-notice__icon" aria-hidden="true">
        <i class="fa-solid fa-location-dot"></i>
        <span></span>
      </div>
      <div class="arrival-notice__content">
        <span class="arrival-notice__eyebrow">Recogida confirmada</span>
        <strong>Tu motorista llego</strong>
        <p>${limpiarMensaje(data.mensaje, "Tu motorista te espera en el punto de recogida.")}</p>
      </div>
      <button class="arrival-notice__close" type="button" aria-label="Cerrar aviso" title="Cerrar">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <span class="arrival-notice__progress" aria-hidden="true"></span>
    </div>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));

  let removeTimer = window.setTimeout(() => cerrarAviso(toast), ARRIVAL_NOTICE_MS);
  toast.querySelector(".arrival-notice__close")?.addEventListener("click", () => {
    window.clearTimeout(removeTimer);
    removeTimer = null;
    cerrarAviso(toast);
  });
}

export function mostrarNotificacionProximidad(data = {}) {
  document.getElementById("toastProximidadMotorista")?.remove();

  const metros = Number(data.metros);
  const distancia = Number.isFinite(metros) && metros > 0
    ? metros < 1000
      ? `${Math.round(metros)} m`
      : `${(metros / 1000).toFixed(1)} km`
    : "muy cerca";
  const eta = data.eta ? `, ${Math.max(1, Math.round(Number(data.eta)))} min` : "";
  const toast = document.createElement("aside");

  toast.id = "toastProximidadMotorista";
  toast.className = "arrival-notice arrival-notice--near";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `
    <div class="arrival-notice__card">
      <div class="arrival-notice__icon" aria-hidden="true"><i class="fa-solid fa-route"></i></div>
      <div class="arrival-notice__content">
        <span class="arrival-notice__eyebrow">Llegada proxima</span>
        <strong>Motorista a punto de llegar</strong>
        <p>Esta a ${distancia}${eta}. Preparate para salir.</p>
      </div>
    </div>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.setTimeout(() => cerrarAviso(toast), 7000);
}

export function actualizarEstadoProximidad(data = {}) {
  const box = document.getElementById("estadoViaje");
  if (!box) return;

  const metros = Number(data.metros);
  const distancia = Number.isFinite(metros) && metros > 0
    ? `${Math.round(metros)} m`
    : "muy cerca";

  box.innerHTML = `
    <div class="arrival-state arrival-state--near">
      <span class="arrival-state__icon" aria-hidden="true"><i class="fa-solid fa-route"></i></span>
      <span><strong>Motorista muy cerca</strong>Distancia aproximada: ${distancia}</span>
    </div>
  `;
}

export function actualizarEstadoLlegada() {
  const box = document.getElementById("estadoViaje");
  if (!box) return;

  box.innerHTML = `
    <div class="arrival-state">
      <span class="arrival-state__icon" aria-hidden="true"><i class="fa-solid fa-location-dot"></i></span>
      <span><strong>Motorista en el punto</strong>Te esta esperando afuera</span>
    </div>
  `;
}

export function reproducirSonidoLlegada() {
  const sonido = document.getElementById("sonidoLlegada");
  if (!sonido) return;

  sonido.currentTime = 0;
  sonido.play().catch(() => {});
}

function cerrarAviso(toast) {
  if (!toast?.isConnected || toast.classList.contains("is-leaving")) return;
  toast.classList.add("is-leaving");
  window.setTimeout(() => toast.remove(), 220);
}

function limpiarMensaje(value, fallback) {
  const texto = String(value || fallback)
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 160);
  return texto || fallback;
}
