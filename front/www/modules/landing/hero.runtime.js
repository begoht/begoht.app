const ROTATING_WORDS = Object.freeze([
  "Tiempo real",
  "Dos ruedas",
  "Colis",
  "BeGO Wallet",
  "Soporte activo"
]);

export function startHeroRuntime() {
  startClock();
  startWordRotation();
}

function startClock() {
  const clockElement = document.getElementById("clock");
  if (!clockElement) return;

  const updateClock = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    clockElement.textContent = `${hours}:${minutes}`;
  };

  updateClock();
  window.setInterval(updateClock, 1000);
}

function startWordRotation() {
  const changingTextElement = document.getElementById("changingText");
  if (!changingTextElement || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let currentIndex = 0;
  window.setInterval(() => {
    currentIndex = (currentIndex + 1) % ROTATING_WORDS.length;
    changingTextElement.classList.add("is-changing");

    window.setTimeout(() => {
      changingTextElement.textContent = ROTATING_WORDS[currentIndex];
      changingTextElement.classList.remove("is-changing");
    }, 180);
  }, 3000);
}
