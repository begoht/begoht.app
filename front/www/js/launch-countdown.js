import { getServerUrl } from "./conexion.js";
import { cityConfig, inferCityConfigFromCoords, persistDetectedCity } from "./map/config/index.js?v=20260624-cordoba-gps";

let gatePromise = null;
let countdownTimer = null;
let statusPollTimer = null;

const STYLE_ID = "begoLaunchCountdownStyle";
const ROOT_ID = "begoLaunchCountdown";

export function initLaunchCountdown() {
  if (gatePromise) return gatePromise;
  gatePromise = loadLaunchGate();
  return gatePromise;
}

async function loadLaunchGate() {
  try {
    if (cityConfig?.test === true) return false;

    const data = await fetchLaunchStatus();
    if (!shouldBlock(data)) return false;
    if (await shouldBypassForDetectedTestCity()) return false;

    return renderCountdown(data);
  } catch (err) {
    console.warn("Launch countdown unavailable:", err?.message || err);
    return false;
  }
}

async function shouldBypassForDetectedTestCity() {
  if (!navigator.geolocation) return false;

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
    });

    const detectedCity = inferCityConfigFromCoords({
      lat: Number(position.coords.latitude),
      lng: Number(position.coords.longitude)
    });

    if (!detectedCity?.test) return false;

    const persisted = persistDetectedCity(detectedCity.id);
    if (persisted && detectedCity.id !== cityConfig.id) {
      window.location.reload();
    }

    return true;
  } catch (err) {
    console.warn("Launch test-city GPS bypass unavailable:", err?.message || err);
    return false;
  }
}

async function fetchLaunchStatus() {
  const res = await fetch(`${getServerUrl()}/api/launch`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  if (!res.ok) return null;
  return res.json();
}

function shouldBlock(data) {
  if (!data?.enabled || !data.launchAt) return false;
  const target = new Date(data.launchAt).getTime();
  return Number.isFinite(target) && target > Date.now();
}

function renderCountdown(data) {
  injectStyles();
  document.getElementById(ROOT_ID)?.remove();
  document.documentElement.classList.add("launch-countdown-locked");
  document.body?.classList.add("launch-countdown-locked");

  const root = document.createElement("section");
  root.id = ROOT_ID;
  root.className = "launch-countdown-shell";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Lancement BeGO");
  root.innerHTML = `
    <div class="launch-countdown-backdrop"></div>
    <article class="launch-countdown-card">
      <div class="launch-orbit" aria-hidden="true">
        <span></span>
        <i class="fa-solid fa-location-dot"></i>
      </div>

      <div class="launch-copy">
        <span class="launch-kicker">BeGO Haiti</span>
        <h2>${escapeHtml(data.title || "Lancement officiel BeGO")}</h2>
        <p>${escapeHtml(data.message || "Votre compte est pret pour le lancement.")}</p>
      </div>

      <div class="launch-time-grid" aria-label="Temps restant">
        ${timeBox("days", "Jours")}
        ${timeBox("hours", "Heures")}
        ${timeBox("minutes", "Min")}
        ${timeBox("seconds", "Sec")}
      </div>

      <div class="launch-date-line">
        <i class="fa-solid fa-calendar-check"></i>
        <span data-launch-date></span>
      </div>

      <div class="launch-lock-note">
        <i class="fa-solid fa-lock"></i>
        <span>Acces automatique a l'ouverture officielle.</span>
      </div>
    </article>
  `;

  document.body.appendChild(root);

  return new Promise((resolve) => {
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearInterval(countdownTimer);
      window.clearInterval(statusPollTimer);
      countdownTimer = null;
      statusPollTimer = null;
      root.classList.add("is-closing");
      document.documentElement.classList.remove("launch-countdown-locked");
      document.body?.classList.remove("launch-countdown-locked");
      window.setTimeout(() => {
        root.remove();
        resolve(true);
      }, 220);
    };

    const tick = () => {
      const remainingMs = updateCountdown(root, data.launchAt);
      if (remainingMs <= 0) finish();
    };

    const syncStatus = async () => {
      try {
        const latest = await fetchLaunchStatus();
        if (!shouldBlock(latest)) {
          finish();
          return;
        }

        data.launchAt = latest.launchAt;
        updateLaunchCopy(root, latest);
      } catch {}
    };

    tick();
    if (!countdownTimer) countdownTimer = window.setInterval(tick, 1000);
    statusPollTimer = window.setInterval(syncStatus, 15000);
  });
}

function timeBox(key, label) {
  return `
    <div class="launch-time-box">
      <strong data-launch-${key}>00</strong>
      <span>${label}</span>
    </div>
  `;
}

function updateCountdown(root, launchAt) {
  const target = new Date(launchAt).getTime();
  const diff = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  setValue(root, "days", days);
  setValue(root, "hours", hours);
  setValue(root, "minutes", minutes);
  setValue(root, "seconds", seconds);

  const dateLine = root.querySelector("[data-launch-date]");
  if (dateLine) {
    dateLine.textContent = new Date(launchAt).toLocaleString("fr-HT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return diff;
}

function setValue(root, key, value) {
  const el = root.querySelector(`[data-launch-${key}]`);
  if (el) el.textContent = String(value).padStart(2, "0");
}

function updateLaunchCopy(root, data) {
  const title = root.querySelector(".launch-copy h2");
  const message = root.querySelector(".launch-copy p");
  if (title) title.textContent = data.title || "Lancement officiel BeGO";
  if (message) message.textContent = data.message || "Votre compte est pret pour le lancement.";
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html.launch-countdown-locked,
    body.launch-countdown-locked {
      overflow: hidden;
      overscroll-behavior: none;
      touch-action: none;
    }

    .launch-countdown-shell {
      position: fixed;
      inset: 0;
      z-index: 100010;
      display: grid;
      place-items: center;
      padding: 18px;
      color: #f8fafc;
    }

    .launch-countdown-shell.is-closing {
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .launch-countdown-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(2, 6, 23, 0.76);
      backdrop-filter: blur(16px);
    }

    .launch-countdown-card {
      position: relative;
      width: min(100%, 390px);
      overflow: hidden;
      display: grid;
      gap: 16px;
      padding: 20px;
      border-radius: 8px;
      background:
        radial-gradient(circle at 84% 8%, rgba(37, 99, 235, 0.36), transparent 32%),
        linear-gradient(180deg, #0f172a 0%, #07111f 100%);
      border: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: 0 26px 70px rgba(2, 6, 23, 0.48);
    }

    .launch-orbit {
      width: 72px;
      height: 72px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: #ffffff;
      background: linear-gradient(180deg, #38bdf8, #2563eb);
      box-shadow: 0 18px 38px rgba(37, 99, 235, 0.34);
    }

    .launch-orbit span {
      position: absolute;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 1px solid rgba(96, 165, 250, 0.28);
      animation: launchPulse 1.8s ease-in-out infinite;
    }

    .launch-copy {
      display: grid;
      gap: 7px;
      min-width: 0;
    }

    .launch-kicker {
      color: #93c5fd;
      font-size: 0.72rem;
      font-weight: 950;
      text-transform: uppercase;
    }

    .launch-copy h2 {
      margin: 0;
      font-size: clamp(1.55rem, 7vw, 2.15rem);
      line-height: 1;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }

    .launch-copy p {
      margin: 0;
      color: #cbd5e1;
      font-size: 0.93rem;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .launch-time-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .launch-time-box {
      min-width: 0;
      min-height: 78px;
      display: grid;
      place-items: center;
      gap: 4px;
      padding: 10px 6px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .launch-time-box strong {
      font-size: clamp(1.25rem, 6vw, 1.7rem);
      line-height: 1;
      letter-spacing: 0;
    }

    .launch-time-box span {
      color: #94a3b8;
      font-size: 0.67rem;
      font-weight: 900;
      text-transform: uppercase;
    }

    .launch-date-line,
    .launch-lock-note {
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 0.86rem;
      font-weight: 850;
      overflow-wrap: anywhere;
    }

    .launch-date-line {
      color: #dbeafe;
      background: rgba(37, 99, 235, 0.12);
    }

    .launch-lock-note {
      color: #bae6fd;
      background: rgba(14, 165, 233, 0.11);
      border: 1px solid rgba(56, 189, 248, 0.16);
    }

    @keyframes launchPulse {
      0%, 100% { transform: scale(0.9); opacity: 0.44; }
      50% { transform: scale(1.08); opacity: 0.18; }
    }

    @media (max-width: 360px) {
      .launch-countdown-card {
        padding: 16px;
      }

      .launch-time-grid {
        gap: 6px;
      }

      .launch-time-box {
        min-height: 68px;
      }
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}
