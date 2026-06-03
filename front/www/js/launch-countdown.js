import { getServerUrl } from "./conexion.js";

let initialized = false;
let countdownTimer = null;

const STYLE_ID = "begoLaunchCountdownStyle";
const ROOT_ID = "begoLaunchCountdown";

export async function initLaunchCountdown() {
  if (initialized) return;
  initialized = true;

  try {
    const res = await fetch(`${getServerUrl()}/api/launch`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (!res.ok) return;

    const data = await res.json();
    if (!shouldShow(data)) return;

    renderCountdown(data);
  } catch (err) {
    console.warn("Launch countdown unavailable:", err?.message || err);
  }
}

function shouldShow(data) {
  if (!data?.enabled || !data.launchAt) return false;
  const key = `bego_launch_seen_${data.launchAt}`;
  if (getSessionFlag(key) === "1") return false;
  return true;
}

function renderCountdown(data) {
  injectStyles();
  document.getElementById(ROOT_ID)?.remove();

  const root = document.createElement("section");
  root.id = ROOT_ID;
  root.className = "launch-countdown-shell";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Lancement BeGO");
  root.innerHTML = `
    <div class="launch-countdown-backdrop" data-launch-close></div>
    <article class="launch-countdown-card">
      <button class="launch-close" type="button" aria-label="Fermer" data-launch-close>
        <i class="fa-solid fa-xmark"></i>
      </button>

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

      <button class="launch-primary" type="button" data-launch-close>
        Continuer dans BeGO
      </button>
    </article>
  `;

  document.body.appendChild(root);
  root.querySelectorAll("[data-launch-close]").forEach((item) => {
    item.addEventListener("click", () => closeCountdown(root, data.launchAt));
  });

  updateCountdown(root, data.launchAt);
  countdownTimer = window.setInterval(() => updateCountdown(root, data.launchAt), 1000);
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

  if (diff <= 0) {
    const title = root.querySelector(".launch-copy h2");
    const message = root.querySelector(".launch-copy p");
    if (title) title.textContent = "BeGO est lance";
    if (message) message.textContent = "Merci d'etre pret avec nous. Vous pouvez continuer dans BeGO.";
  }
}

function setValue(root, key, value) {
  const el = root.querySelector(`[data-launch-${key}]`);
  if (el) el.textContent = String(value).padStart(2, "0");
}

function closeCountdown(root, launchAt) {
  setSessionFlag(`bego_launch_seen_${launchAt}`, "1");
  root.classList.add("is-closing");
  window.clearInterval(countdownTimer);
  window.setTimeout(() => root.remove(), 180);
}

function getSessionFlag(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function setSessionFlag(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .launch-countdown-shell {
      position: fixed;
      inset: 0;
      z-index: 99990;
      display: grid;
      place-items: center;
      padding: 18px;
      color: #f8fafc;
    }

    .launch-countdown-shell.is-closing {
      opacity: 0;
      transition: opacity 0.18s ease;
    }

    .launch-countdown-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(2, 6, 23, 0.68);
      backdrop-filter: blur(14px);
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

    .launch-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 8px;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.08);
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
      padding-right: 34px;
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

    .launch-date-line {
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      color: #dbeafe;
      background: rgba(37, 99, 235, 0.12);
      font-size: 0.86rem;
      font-weight: 850;
      overflow-wrap: anywhere;
    }

    .launch-primary {
      min-height: 48px;
      border: 0;
      border-radius: 8px;
      color: #ffffff;
      background: linear-gradient(180deg, #38bdf8, #2563eb);
      font-weight: 950;
      box-shadow: 0 16px 32px rgba(37, 99, 235, 0.25);
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
