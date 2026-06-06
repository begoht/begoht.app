import { getServerUrl } from "./conexion.js";
import { cityConfig, inferCityConfigFromCoords, persistDetectedCity } from "./map/config/index.js";

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
      <div class="launch-map-bg" aria-hidden="true">
        <svg viewBox="0 0 420 250" role="img">
          <path class="launch-map-island" d="M41 111 C70 88, 118 89, 152 96 C175 101, 193 90, 215 82 C244 71, 268 80, 289 93 C311 106, 343 104, 378 92 C387 89, 396 95, 394 104 C390 124, 357 136, 330 138 C305 140, 287 149, 267 162 C244 177, 216 180, 192 171 C164 160, 144 164, 122 176 C95 191, 61 183, 45 161 C32 143, 25 124, 41 111 Z" />
          <path class="launch-map-south" d="M172 170 C202 183, 241 181, 268 163 C283 153, 294 150, 310 150 C288 166, 270 186, 244 196 C218 206, 189 199, 172 170 Z" />
          <circle class="launch-map-dot" cx="252" cy="178" r="6" />
          <circle class="launch-map-ring" cx="252" cy="178" r="15" />
          <text x="267" y="183">Jacmel</text>
        </svg>
      </div>

      <div class="launch-topline">
        <div class="launch-orbit" aria-hidden="true">
          <span></span>
          <i class="fa-solid fa-location-dot"></i>
        </div>
        <div class="launch-location-pill">
          <i class="fa-solid fa-map-location-dot"></i>
          <span>Jacmel, Haiti</span>
        </div>
      </div>

      <div class="launch-copy">
        <span class="launch-kicker">BeGO Haiti</span>
        <h2>${escapeHtml(data.title || "Lancement officiel BeGO a Jacmel")}</h2>
        <p>${escapeHtml(data.message || "Le service ouvre d'abord a Jacmel. Votre compte est pret pour le lancement officiel.")}</p>
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
  if (title) title.textContent = data.title || "Lancement officiel BeGO a Jacmel";
  if (message) message.textContent = data.message || "Le service ouvre d'abord a Jacmel. Votre compte est pret pour le lancement officiel.";
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
      box-sizing: border-box;
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
      width: min(100%, 350px);
      max-width: calc(100vw - 32px);
      box-sizing: border-box;
      overflow: hidden;
      display: grid;
      gap: 16px;
      padding: 20px;
      border-radius: 8px;
      background:
        radial-gradient(circle at 82% 12%, rgba(37, 99, 235, 0.32), transparent 34%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(7, 17, 31, 0.98) 100%);
      border: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: 0 26px 70px rgba(2, 6, 23, 0.48);
    }

    .launch-countdown-card > *:not(.launch-map-bg) {
      position: relative;
      z-index: 2;
      box-sizing: border-box;
    }

    .launch-map-bg {
      position: absolute;
      inset: 0;
      z-index: 1;
      opacity: 0.72;
      pointer-events: none;
    }

    .launch-map-bg svg {
      position: absolute;
      width: 126%;
      height: 76%;
      right: -28%;
      top: -3%;
      filter: drop-shadow(0 24px 48px rgba(15, 23, 42, 0.5));
    }

    .launch-map-island,
    .launch-map-south {
      fill: rgba(30, 64, 175, 0.2);
      stroke: rgba(147, 197, 253, 0.32);
      stroke-width: 3;
    }

    .launch-map-south {
      fill: rgba(14, 165, 233, 0.12);
    }

    .launch-map-dot {
      fill: #38bdf8;
      stroke: #ffffff;
      stroke-width: 3;
    }

    .launch-map-ring {
      fill: rgba(56, 189, 248, 0.12);
      stroke: rgba(186, 230, 253, 0.92);
      stroke-width: 2;
      animation: launchMapPulse 1.8s ease-in-out infinite;
    }

    .launch-map-bg text {
      fill: #e0f2fe;
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0;
      paint-order: stroke;
      stroke: rgba(2, 6, 23, 0.82);
      stroke-width: 4;
    }

    .launch-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
    }

    .launch-orbit {
      width: 72px;
      height: 72px;
      position: relative;
      flex: 0 0 auto;
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

    .launch-location-pill {
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      max-width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      color: #dbeafe;
      background: rgba(15, 23, 42, 0.58);
      border: 1px solid rgba(147, 197, 253, 0.28);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      font-size: 0.78rem;
      font-weight: 950;
      text-transform: uppercase;
      white-space: normal;
      line-height: 1.22;
    }

    .launch-location-pill span {
      min-width: 0;
      overflow-wrap: anywhere;
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
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

    @keyframes launchMapPulse {
      0%, 100% { transform: scale(0.88); opacity: 0.88; }
      50% { transform: scale(1.18); opacity: 0.28; }
    }

    @media (max-width: 700px) {
      .launch-countdown-shell {
        padding: 16px;
        align-items: center;
        justify-items: start;
      }

      .launch-countdown-card {
        width: min(358px, calc(100vw - 32px));
      }

      .launch-map-bg text {
        display: none;
      }
    }

    @media (max-width: 360px) {
      .launch-countdown-card {
        padding: 16px;
      }

      .launch-topline {
        align-items: flex-start;
      }

      .launch-location-pill {
        font-size: 0.7rem;
        padding: 9px 10px;
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
